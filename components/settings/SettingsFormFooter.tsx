import { View } from 'react-native'

import { Button } from '@/components/ui/Button'

type Props = {
  cancelLabel?: string
  saveLabel?: string
  onCancel: () => void
  onSave: () => void
  saving?: boolean
  disabled?: boolean
}

/** Full-width stacked actions — place inline below form content (not a sticky footer). */
export function SettingsFormFooter({
  cancelLabel = 'Cancel',
  saveLabel = 'Save Changes',
  onCancel,
  onSave,
  saving = false,
  disabled = false,
}: Props): JSX.Element {
  return (
    <View className="mt-8 gap-3">
      <Button
        variant="primary"
        className="w-full"
        loading={saving}
        disabled={disabled}
        onPress={onSave}
      >
        {saveLabel}
      </Button>
      <Button
        variant="secondary"
        className="w-full"
        disabled={saving || disabled}
        onPress={onCancel}
      >
        {cancelLabel}
      </Button>
    </View>
  )
}
