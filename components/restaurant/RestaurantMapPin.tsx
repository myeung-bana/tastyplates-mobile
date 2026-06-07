import { Text, View } from 'react-native'
import { AppIcon } from '@/components/ui/AppIcon'

interface RestaurantMapPinProps {
  isSelected: boolean
  rating?: number | null
}

export function RestaurantMapPin({
  isSelected,
  rating,
}: RestaurantMapPinProps): JSX.Element {
  const bg = isSelected ? '#31343F' : '#ff7c0a'
  const size = isSelected ? 44 : 36

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        borderWidth: isSelected ? 2.5 : 0,
        borderColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
      }}
    >
      {rating != null && rating > 0 ? (
        <Text
          style={{
            color: 'white',
            fontSize: isSelected ? 11 : 9,
            fontFamily: 'Neusans',
            fontWeight: '600',
          }}
        >
          {rating.toFixed(1)}
        </Text>
      ) : (
        <AppIcon name="restaurant" size={isSelected ? 18 : 14} color="white" />
      )}
    </View>
  )
}
