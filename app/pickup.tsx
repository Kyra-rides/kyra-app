import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { BrandButton } from '@/components/brand-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

export default function PickupScreen() {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.mapArea}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={Brand.beige} />
        </Pressable>
        <View style={styles.pin}>
          <MaterialIcons name="place" size={36} color={Brand.gold} />
          <ThemedText style={styles.pinLabel}>Pickup</ThemedText>
        </View>
        <ThemedText style={styles.mapHint}>Drag the map to set your pickup point</ThemedText>
      </View>

      <View style={styles.sheet}>
        <ThemedText style={styles.sheetHint}>Pickup point</ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.address}>
          12, 100 Ft Rd, Indiranagar
        </ThemedText>
        <ThemedText style={styles.addressSub}>
          Bengaluru, Karnataka 560038
        </ThemedText>

        <ThemedText style={styles.saveLabel}>Save this location as</ThemedText>
        <View style={styles.saveRow}>
          <Pressable style={styles.saveChip}>
            <MaterialIcons name="home" size={16} color={Brand.beige} />
            <ThemedText style={styles.saveChipText}>Home</ThemedText>
          </Pressable>
          <Pressable style={styles.saveChip}>
            <MaterialIcons name="work-outline" size={16} color={Brand.beige} />
            <ThemedText style={styles.saveChipText}>Work</ThemedText>
          </Pressable>
          <Pressable style={styles.saveChip}>
            <MaterialIcons name="add" size={16} color={Brand.beige} />
            <ThemedText style={styles.saveChipText}>Add new</ThemedText>
          </Pressable>
        </View>

        <BrandButton title="Confirm pickup" onPress={() => router.push('/vehicles')} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.burgundy,
  },
  mapArea: {
    flex: 1,
    backgroundColor: Brand.burgundyDark,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  back: {
    position: 'absolute',
    top: 56,
    left: 16,
    padding: 8,
    backgroundColor: Brand.burgundy,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  pin: {
    alignItems: 'center',
    gap: 4,
  },
  pinLabel: {
    backgroundColor: Brand.burgundy,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.border,
    fontSize: 12,
  },
  mapHint: {
    position: 'absolute',
    bottom: 16,
    color: Brand.beigeMuted,
    fontSize: 12,
  },
  sheet: {
    padding: 20,
    paddingBottom: 32,
    backgroundColor: Brand.burgundyLight,
    borderTopWidth: 1,
    borderTopColor: Brand.border,
    gap: 6,
  },
  sheetHint: {
    fontSize: 12,
    color: Brand.beigeMuted,
  },
  address: {
    fontSize: 16,
    marginTop: 2,
  },
  addressSub: {
    fontSize: 13,
    color: Brand.beigeMuted,
    marginBottom: 14,
  },
  saveLabel: {
    fontSize: 12,
    color: Brand.beigeMuted,
    marginTop: 4,
  },
  saveRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  saveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.burgundy,
  },
  saveChipText: {
    fontSize: 13,
  },
});
