import React, { useEffect, useState } from "react";
import { Redirect, Tabs } from "expo-router";
import { color } from "../../src/ui";
import { HomeIcon, DumbbellIcon, LotusIcon, OmGlyph, MoonIcon, BowlIcon } from "../../src/ui/icons";
import { useI18n } from "../../src/lib/i18n";
import { loadProfile } from "../../src/lib/profile";

/**
 * The tabs are the app, so the first-run gate lives here rather than on Home:
 * every tab is behind it, and redirecting at render (not in an effect) means
 * a new user never sees a frame of Home before onboarding.
 */
export default function TabsLayout() {
  const { t } = useI18n();
  const [onboarded, setOnboarded] = useState<boolean | null>(null); // null = still checking

  useEffect(() => {
    let alive = true;
    loadProfile()
      .then((p) => alive && setOnboarded(p.onboarded))
      // storage unavailable → send them through onboarding rather than trap them
      .catch(() => alive && setOnboarded(false));
    return () => {
      alive = false;
    };
  }, []);

  if (onboarded === null) return null;
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.saffron,
        tabBarInactiveTintColor: color.muted,
        tabBarStyle: {
          backgroundColor: "#120D08",
          borderTopColor: color.line,
          height: 66,
          paddingTop: 6,
          paddingBottom: 10,
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
        name="diet"
        options={{
          title: t("tab_diet"),
          tabBarIcon: ({ color: c }) => <BowlIcon color={c} />,
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
