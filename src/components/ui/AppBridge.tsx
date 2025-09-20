'use client'

import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react'
import { AppProvider } from '@shopify/polaris'
import '@shopify/polaris/build/esm/styles.css'

interface AppBridgeProps {
  children: React.ReactNode
  apiKey?: string
  host?: string
}

export function AppBridge({ children, apiKey, host }: AppBridgeProps) {
  const config = {
    apiKey: apiKey || process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || 'test_key',
    host: host || 'admin.shopify.com',
    forceRedirect: true,
  }

  return (
    <AppBridgeProvider config={config}>
      <AppProvider
        i18n={{
          Polaris: {
            Avatar: {
              label: 'Avatar',
              labelWithInitials: 'Avatar with initials {initials}',
            },
            ContextualSaveBar: {
              save: 'Save',
              discard: 'Discard',
            },
            TextField: {
              characterCount: '{count} characters',
            },
            TopBar: {
              toggleMenuLabel: 'Toggle menu',
              SearchField: {
                clearButtonLabel: 'Clear',
                search: 'Search',
              },
            },
            Modal: {
              iFrameTitle: 'body markup',
            },
            Frame: {
              skipToContent: 'Skip to content',
              Navigation: {
                closeMobileNavigationLabel: 'Close navigation',
              },
            },
          },
        }}
      >
        {children}
      </AppProvider>
    </AppBridgeProvider>
  )
}