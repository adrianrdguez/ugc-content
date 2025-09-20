import { Card, Stack, Text, ProgressBar } from '@shopify/polaris'

interface UploadProgressProps {
  progress: number
  message: string
  stage: 'idle' | 'validating' | 'uploading' | 'processing' | 'completed' | 'error'
}

export function UploadProgress({ progress, message, stage }: UploadProgressProps) {
  if (stage === 'idle') return null

  return (
    <Card sectioned>
      <Stack vertical spacing="tight">
        <Stack distribution="equalSpacing">
          <Text as="p" variant="bodyMd">
            {message}
          </Text>
          <Text as="p" variant="bodyMd">
            {progress}%
          </Text>
        </Stack>
        <ProgressBar 
          progress={progress} 
          tone={stage === 'error' ? 'critical' : 'primary'}
        />
      </Stack>
    </Card>
  )
}