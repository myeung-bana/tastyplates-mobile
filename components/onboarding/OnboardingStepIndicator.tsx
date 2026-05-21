import { Fragment } from 'react'
import { Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const STEPS: { id: 1 | 2 | 3; label: string }[] = [
  { id: 1, label: 'Username' },
  { id: 2, label: 'Region' },
  { id: 3, label: 'Palate' },
]

const BRAND = '#ff7c0a'
const MUTED = '#d1d5db'
const TRACK = '#e5e7eb'

type Props = {
  currentStep: 1 | 2 | 3
}

export function OnboardingStepIndicator({ currentStep }: Props): JSX.Element {
  return (
    <View className="mb-8 flex-row items-start">
      {STEPS.map((step, index) => {
        const complete = currentStep > step.id
        const active = currentStep === step.id
        const connectorComplete = currentStep > step.id
        return (
          <Fragment key={step.id}>
            <View className="min-w-0 flex-1 items-center">
              <View
                className="mb-1 h-9 w-9 items-center justify-center rounded-full border-2"
                style={{
                  borderColor: complete || active ? BRAND : MUTED,
                  backgroundColor: complete || active ? BRAND : 'transparent',
                }}
              >
                {complete ? (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                ) : (
                  <Text className="text-sm font-semibold" style={{ color: active ? '#fff' : '#9ca3af' }}>
                    {step.id}
                  </Text>
                )}
              </View>
              <Text
                className="text-center text-xs font-medium"
                style={{ color: active || complete ? '#374151' : '#9ca3af' }}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
            {index < STEPS.length - 1 ? (
              <View
                className="mt-[18px] h-0.5 min-w-[16px] flex-1"
                style={{ maxHeight: 2, backgroundColor: connectorComplete ? BRAND : TRACK }}
              />
            ) : null}
          </Fragment>
        )
      })}
    </View>
  )
}
