-- Fix user registration issues

-- First, drop existing trigger and function to recreate them
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Update RLS policies for user_profiles to allow service role operations
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service can insert profiles" ON user_profiles;

-- Create more permissive policies for user registration
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Service can insert profiles" ON user_profiles
    FOR INSERT WITH CHECK (true);

-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into user_profiles with error handling
    INSERT INTO public.user_profiles (id, email, first_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'first_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1)
        )
    );
    
    RETURN NEW;
EXCEPTION 
    WHEN others THEN
        -- Log the error but don't fail the user creation
        RAISE LOG 'Error creating user profile for %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Also create a function to manually create missing profiles
CREATE OR REPLACE FUNCTION create_missing_user_profile(user_id UUID, user_email TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, first_name)
    VALUES (
        user_id,
        user_email,
        split_part(user_email, '@', 1)
    )
    ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;
GRANT ALL ON public.user_rewards TO anon, authenticated;
GRANT ALL ON public.reward_transactions TO anon, authenticated;
GRANT ALL ON public.reward_redemptions TO anon, authenticated;