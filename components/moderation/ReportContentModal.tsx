import { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppIcon } from '@/components/ui/AppIcon'
import { Button } from '@/components/ui/Button'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  TEXT_BODY,
  TEXT_HEADING,
  TEXT_MUTED,
  mergeTextInputBodyTypography,
} from '@/constants/brand'
import {
  REPORT_REASON_OPTIONS,
  submitContentReport,
  type ReportReason,
  type ReportTargetType,
} from '@/services/moderationService'
import { toast } from '@/utils/toast'

const TARGET_NOUN: Record<ReportTargetType, string> = {
  review: 'review',
  comment: 'comment',
  user: 'profile',
  list: 'list',
}

export interface ReportTarget {
  targetType: ReportTargetType
  targetId: string
}

export function ReportContentModal({
  target,
  onClose,
}: {
  target: ReportTarget | null
  onClose: () => void
}): JSX.Element {
  const insets = useSafeAreaInsets()
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (target) {
      setReason(null)
      setDetails('')
    }
  }, [target])

  const submit = async () => {
    if (!target || !reason) return
    setSubmitting(true)
    try {
      await submitContentReport({ ...target, reason, details })
      toast.success('Thanks — our team will review this report within 24 hours.')
      onClose()
    } catch {
      toast.error('Could not send your report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const noun = target ? TARGET_NOUN[target.targetType] : 'content'

  return (
    <Modal visible={target != null} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          className="flex-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
          onPress={onClose}
          accessibilityLabel="Close report"
        />
        <View
          className="rounded-t-3xl bg-white px-5 pt-4"
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 8, maxHeight: '85%' }}
        >
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-semibold font-neusans" style={{ color: TEXT_HEADING }}>
              Report {noun}
            </Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <AppIcon name="x" size={22} color={TEXT_MUTED} />
            </Pressable>
          </View>
          <Text className="mb-3 text-sm font-neusans" style={{ color: TEXT_BODY }}>
            Why are you reporting this {noun}? Reports are anonymous.
          </Text>

          <ScrollView keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }}>
            {REPORT_REASON_OPTIONS.map((option) => {
              const selected = option.value === reason
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setReason(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  className="flex-row items-center justify-between border-b py-3"
                  style={{ borderBottomColor: BORDER_SUBTLE }}
                >
                  <Text className="text-base font-neusans" style={{ color: TEXT_HEADING }}>
                    {option.label}
                  </Text>
                  <AppIcon
                    name={selected ? 'check-circle' : 'circle'}
                    size={20}
                    color={selected ? BRAND_PRIMARY : TEXT_MUTED}
                  />
                </Pressable>
              )
            })}

            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Add details (optional)"
              multiline
              maxLength={1000}
              className="mb-4 mt-4 min-h-[72px] rounded-xl border px-4 py-3 font-neusans text-base"
              style={mergeTextInputBodyTypography({
                color: TEXT_HEADING,
                borderColor: BORDER_SUBTLE,
                textAlignVertical: 'top',
              })}
            />
          </ScrollView>

          <Button onPress={() => void submit()} disabled={!reason} loading={submitting}>
            Submit report
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
