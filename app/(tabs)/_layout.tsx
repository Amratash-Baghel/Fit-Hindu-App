import React from "react";
import { Tabs } from "expo-router";
import { Text } from "react-native";
import { color } from "../../src/ui";
import { useI18n } from "../../src/lib/i18n";

/** Simple glyph tab icons for the scaffold; real icon set lands with the
 *  workout feature build. */
function Glyph({ ch, focused }: { ch: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 18, color: focused ? color.saffron : color.muted }}>{ch}</Text>
  );
}

export default function TabsLayout() {
  const { t } = useI18n();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.saffron,
        tabBarInactiveTintColor: color.muted,
        tabBarStyle: {
          backgroundColor: "#120D08",
          borderTopColor: color.line,
          height: 64,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tab_home"),
          tabBarIcon: ({ focused }) => <Glyph ch="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: t("tab_workout"),
          tabBarIcon: ({ focused }) => <Glyph ch="💪" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="meditation"
        options={{
          title: t("tab_meditation"),
          tabBarIcon: ({ focused }) => <Glyph ch="🪷" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="jap"
        options={{
          title: t("tab_jap"),
          tabBarIcon: ({ focused }) => <Glyph ch="🕉️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="sleep"
        options={{
          title: t("tab_sleep"),
          tabBarIcon: ({ focused }) => <Glyph ch="🌙" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
