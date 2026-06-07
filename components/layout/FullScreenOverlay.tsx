import type { PropsWithChildren } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  View,
  type ModalProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native'

import { useFullScreenOverlayInsets } from '@/hooks/useFullScreenOverlayInsets'

export interface FullScreenOverlayProps extends PropsWithChildren {
  visible?: boolean
  onRequestClose: () => void
  animationType?: ModalProps['animationType']
  backgroundColor?: string
  keyboardAvoiding?: boolean
  style?: StyleProp<ViewStyle>
}

/**
 * Standard full-screen Modal shell for modern phones (notch, Dynamic Island, home indicator).
 * Applies explicit safe-area padding — prefer over `SafeAreaView` inside Modals.
 */
export function FullScreenOverlay({
  visible = true,
  onRequestClose,
  animationType = 'slide',
  backgroundColor = '#fff',
  keyboardAvoiding = false,
  style,
  children,
}: FullScreenOverlayProps) {
  const { top, bottom, left, right } = useFullScreenOverlayInsets()

  const content = (
    <View
      style={[
        {
          flex: 1,
          backgroundColor,
          paddingTop: top,
          paddingBottom: bottom,
          paddingLeft: left,
          paddingRight: right,
        },
        style,
      ]}
    >
      {children}
    </View>
  )

  return (
    <Modal
      visible={visible}
      animationType={animationType}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onRequestClose}
    >
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </Modal>
  )
}

export { useFullScreenOverlayInsets, FULL_SCREEN_OVERLAY_INNER_PAD } from '@/hooks/useFullScreenOverlayInsets'
