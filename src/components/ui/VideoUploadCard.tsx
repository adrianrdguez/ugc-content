import { useState, useCallback } from 'react'
import {
  Card,
  DropZone,
  Stack,
  Text,
  Heading,
  Button,
  Thumbnail,
  Caption,
  Banner
} from '@shopify/polaris'
import { VideoMajor } from '@shopify/polaris-icons'

interface VideoUploadCardProps {
  onFileSelect: (file: File) => void
  selectedFile?: File | null
  disabled?: boolean
  error?: string
}

export function VideoUploadCard({ 
  onFileSelect, 
  selectedFile, 
  disabled = false,
  error 
}: VideoUploadCardProps) {
  const [dragActive, setDragActive] = useState(false)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleDropZoneDrop = useCallback(
    (_dropFiles: File[], acceptedFiles: File[], rejectedFiles: File[]) => {
      if (rejectedFiles.length > 0) {
        return // Error handling should be done by parent
      }
      
      const file = acceptedFiles[0]
      if (file) {
        onFileSelect(file)
      }
    },
    [onFileSelect],
  )

  const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']

  const fileUpload = !selectedFile && (
    <DropZone
      accept={validVideoTypes.join(',')}
      type="video"
      onDrop={handleDropZoneDrop}
      disabled={disabled}
      onDragEnter={() => setDragActive(true)}
      onDragLeave={() => setDragActive(false)}
    >
      <DropZone.FileUpload 
        actionTitle="Upload video" 
        actionHint="or drop video to upload"
      />
    </DropZone>
  )

  const uploadedFile = selectedFile && (
    <Stack vertical>
      <Stack>
        <Thumbnail
          size="small"
          alt={selectedFile.name}
          source={VideoMajor}
        />
        <Stack vertical spacing="extraTight">
          <Text variant="bodyMd" as="p" fontWeight="medium">
            {selectedFile.name}
          </Text>
          <Caption>
            {formatFileSize(selectedFile.size)} • {selectedFile.type}
          </Caption>
        </Stack>
      </Stack>
      <Button
        size="slim"
        onClick={() => onFileSelect(null as any)}
        disabled={disabled}
      >
        Remove file
      </Button>
    </Stack>
  )

  return (
    <Card>
      <Card.Section>
        <Stack vertical spacing="loose">
          <Stack vertical spacing="tight">
            <Heading>Upload Your Video</Heading>
            <Text as="p" tone="subdued">
              MP4, WebM, MOV, or AVI. Maximum size: 100MB.
            </Text>
          </Stack>

          {error && (
            <Banner tone="critical">
              <Text as="p">{error}</Text>
            </Banner>
          )}

          <Stack vertical>
            {fileUpload}
            {uploadedFile}
          </Stack>

          <Card>
            <Card.Section>
              <Stack vertical spacing="tight">
                <Heading>Video Guidelines</Heading>
                <Stack vertical spacing="extraTight">
                  <Text as="p">• Good lighting and clear audio</Text>
                  <Text as="p">• Show the product in use</Text>
                  <Text as="p">• Share your honest experience</Text>
                  <Text as="p">• Keep it between 30-120 seconds</Text>
                </Stack>
              </Stack>
            </Card.Section>
          </Card>
        </Stack>
      </Card.Section>
    </Card>
  )
}