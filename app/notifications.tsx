import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

type Notice = {
  id: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  body: string;
  when: string;
};

const notices: Notice[] = [
  {
    id: 'n1',
    icon: 'check-circle',
    title: 'Ride completed',
    body: 'Indiranagar Metro → Cubbon Park · ₹142',
    when: 'Today, 3:25 PM',
  },
  {
    id: 'n2',
    icon: 'verified-user',
    title: 'Identity verified',
    body: 'Welcome to Kyra. You can now book rides.',
    when: 'Yesterday',
  },
  {
    id: 'n3',
    icon: 'security',
    title: 'New trusted contact suggestion',
    body: 'Add a contact so we can share live trips on every ride.',
    when: '2 days ago',
  },
];

export default function NotificationsScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="Notifications" />

      <ScrollView contentContainerStyle={styles.content}>
        {notices.map((n) => (
          <View key={n.id} style={styles.card}>
            <MaterialIcons name={n.icon} size={22} color={Brand.gold} style={styles.icon} />
            <View style={styles.text}>
              <ThemedText type="defaultSemiBold">{n.title}</ThemedText>
              <ThemedText style={styles.body}>{n.body}</ThemedText>
              <ThemedText style={styles.when}>{n.when}</ThemedText>
            </View>
          </View>
        ))}
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
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  icon: {
    marginTop: 2,
  },
  text: {
    flex: 1,
  },
  body: {
    fontSize: 13,
    color: Brand.beigeMuted,
    marginTop: 2,
  },
  when: {
    fontSize: 11,
    color: Brand.beigeMuted,
    marginTop: 6,
  },
});
