-- Enable RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create users profile table (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create rewards table
CREATE TABLE user_rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_domain TEXT NOT NULL,
    points INT DEFAULT 0,
    total_videos INT DEFAULT 0,
    total_approved INT DEFAULT 0,
    level INT DEFAULT 1,
    badges JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint: one reward record per user per shop
    UNIQUE(user_id, shop_domain)
);

-- Create reward transactions table (for tracking point history)
CREATE TABLE reward_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_domain TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'bonus', 'penalty')),
    points INT NOT NULL,
    description TEXT,
    submission_id UUID REFERENCES ugc_submissions(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create redemptions table (for tracking reward redemptions)
CREATE TABLE reward_redemptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_domain TEXT NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('discount_code', 'store_credit', 'free_shipping', 'product')),
    points_cost INT NOT NULL,
    reward_value TEXT NOT NULL, -- discount code, credit amount, etc.
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'expired', 'cancelled')),
    expires_at TIMESTAMP,
    fulfilled_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_rewards_user_shop ON user_rewards(user_id, shop_domain);
CREATE INDEX idx_reward_transactions_user ON reward_transactions(user_id);
CREATE INDEX idx_reward_transactions_shop ON reward_transactions(shop_domain);
CREATE INDEX idx_reward_redemptions_user ON reward_redemptions(user_id);
CREATE INDEX idx_reward_redemptions_status ON reward_redemptions(status);

-- Create updated_at trigger functions
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE
    ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_rewards_updated_at BEFORE UPDATE
    ON user_rewards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies

-- User profiles: users can only see and edit their own profile
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- User rewards: users can only see their own rewards
ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rewards" ON user_rewards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rewards" ON user_rewards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rewards" ON user_rewards
    FOR UPDATE USING (auth.uid() = user_id);

-- Reward transactions: users can only see their own transactions
ALTER TABLE reward_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON reward_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can insert transactions" ON reward_transactions
    FOR INSERT WITH CHECK (true); -- Allow service role to insert

-- Reward redemptions: users can only see their own redemptions
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own redemptions" ON reward_redemptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own redemptions" ON reward_redemptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can update redemptions" ON reward_redemptions
    FOR UPDATE WITH CHECK (true); -- Allow service role to update

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, email, first_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to calculate user level based on points
CREATE OR REPLACE FUNCTION calculate_user_level(total_points INT)
RETURNS INT AS $$
BEGIN
    RETURN CASE
        WHEN total_points < 100 THEN 1
        WHEN total_points < 500 THEN 2
        WHEN total_points < 1000 THEN 3
        WHEN total_points < 2500 THEN 4
        WHEN total_points < 5000 THEN 5
        ELSE 6
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to add points to user
CREATE OR REPLACE FUNCTION add_user_points(
    p_user_id UUID,
    p_shop_domain TEXT,
    p_points INT,
    p_description TEXT DEFAULT 'Points earned',
    p_submission_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    new_total INT;
    new_level INT;
BEGIN
    -- Insert reward transaction
    INSERT INTO reward_transactions (user_id, shop_domain, type, points, description, submission_id)
    VALUES (p_user_id, p_shop_domain, 'earned', p_points, p_description, p_submission_id);
    
    -- Update or create user rewards record
    INSERT INTO user_rewards (user_id, shop_domain, points)
    VALUES (p_user_id, p_shop_domain, p_points)
    ON CONFLICT (user_id, shop_domain)
    DO UPDATE SET
        points = user_rewards.points + p_points,
        updated_at = NOW();
    
    -- Get new total and calculate level
    SELECT points INTO new_total FROM user_rewards 
    WHERE user_id = p_user_id AND shop_domain = p_shop_domain;
    
    new_level := calculate_user_level(new_total);
    
    -- Update level if it changed
    UPDATE user_rewards 
    SET level = new_level 
    WHERE user_id = p_user_id AND shop_domain = p_shop_domain AND level != new_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;