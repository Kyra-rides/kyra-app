import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useState } from 'react';

import { ListRow } from '@/components/list-row';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

export default function SafetyScreen() {
  const [autoShare, setAutoShare] = useState(true);

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="Safety" />

      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.sosCard}>
          <MaterialIcons name="emergency" size={28} color="#F4B7B7" />
          <View style={styles.sosText}>
            <ThemedText type="defaultSemiBold" style={styles.sosTitle}>
              SOS
            </ThemedText>
            <ThemedText style={styles.sosSub}>
              Hold to alert Kyra ops + your trusted contacts
            </ThemedText>
          </View>
        </Pressable>

        <ThemedText style={styles.section}>Trip sharing</ThemedText>
        <View style={styles.group}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <ThemedText>Auto-share every ride</ThemedText>
              <ThemedText style={styles.toggleHint}>
                Share live trip with trusted contacts on every booking
              </ThemedText>
            </View>
            <Switch
              value={autoShare}
              onValueChange={setAutoShare}
              trackColor={{ false: Brand.border, true: Brand.gold }}
              thumbColor={Brand.beige}
            />
          </View>
        </View>

        <ThemedText style={styles.section}>Trusted contacts</ThemedText>
        <View style={styles.group}>
          <ListRow icon="person-add-alt" label="Add a contact" />
        </View>

        <ThemedText style={styles.section}>Other</ThemedText>
        <View style={styles.group}>
          <ListRow icon="local-police" label="Bengaluru police helpline" hint="100" />
          <ListRow icon="medical-services" label="Women helpline" hint="1091" />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.burgundy,
  },
  content: {
    padding: 16,
    gap: 6,
  },
  sosCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: Brand.radius,
    backgroundColor: '#3A0E12',
    borderWidth: 1,
    borderColor: '#B33A3A',
  },
  sosText: {
    flex: 1,
  },
  sosTitle: {
    color: '#F4B7B7',
    fontSize: 18,
  },
  sosSub: {
    fontSize: 12,
    color: Brand.beigeMuted,
    marginTop: 2,
  },
  section: {
    color: Brand.beigeMuted,
    fontSize: 12,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  group: {
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Brand.radius,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  toggleText: {
    flex: 1,
  },
  toggleHint: {
    fontSize: 12,
    color: Brand.beigeMuted,
    marginTop: 2,
  },
});
