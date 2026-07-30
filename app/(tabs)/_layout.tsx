import React from "react";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color } from "../../src/ui";
import { HomeIcon, DumbbellIcon, LotusIcon, OmGlyph, MoonIcon } from "../../src/ui/icons";
import { useI18n } from "../../src/lib/i18n";

export default function TabsLayout() {
  const { t } = useI18n();
  // Android renders edge-to-edge from Expo SDK 54 on: the system nav bar
  // (gesture pill or 3-button bar) floats OVER the app rather than reserving
  // its own space. A fixed-height tab bar with no bottom inset sits partly
  // underneath it — the icons still show, but the bottom slice of the tap
  // target is covered and unclickable. insets.bottom is the height to add.
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.saffron,
        tabBarInactiveTintColor: color.muted,
        tabBarStyle: {
          backgroundColor: "#120D08",
          borderTopColor: color.line,
          height: 66 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 10 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tab_home"),
          tabBarIcon: ({ color: c }) => <HomeIcon color={c} />,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: t("tab_workout"),
          tabBarIcon: ({ color: c }) => <DumbbellIcon color={c} />,
        }}
      />
      <Tabs.Screen
        name="meditation"
        options={{
          title: t("tab_meditation"),
          tabBarIcon: ({ color: c }) => <LotusIcon color={c} />,
        }}
      />
      <Tabs.Screen
        name="jap"
        options={{
          title: t("tab_jap"),
          tabBarIcon: ({ color: c }) => <OmGlyph color={c} size={20} />,
        }}
      />
      <Tabs.Screen
        name="sleep"
        options={{
          title: t("tab_sleep"),
          tabBarIcon: ({ color: c }) => <MoonIcon color={c} />,
        }}
      />
    </Tabs>
  );
}
