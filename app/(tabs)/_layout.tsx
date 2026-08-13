import React from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, pillar, type PillarKey } from "../../src/ui";
import { HomeIcon, DumbbellIcon, LotusIcon, OmGlyph } from "../../src/ui/icons";
import { useI18n } from "../../src/lib/i18n";
import { PillarsProvider, usePillars, pillarComplete } from "../../src/lib/pillars";

/**
 * BMS navigation (docs/specs/redesign-bms.md): four tabs — Home and the three
 * pillars (तन Body · मन Mind · आत्मा Soul). The five module screens stay in
 * this group as HIDDEN routes (href: null): every existing deep link and
 * router.push("/(tabs)/workout") etc. keeps working, and the tab bar stays
 * visible inside a module so there is always a way back.
 *
 * PillarsProvider wraps the whole group so the tab-bar done-dots and Home's
 * rings read one shared, refreshing source (redesign — "a tab bar that reads
 * like the day"): finish a pillar and its dot lights the moment you're back.
 */
export default function TabsLayout() {
  return (
    <PillarsProvider>
      <TabsInner />
    </PillarsProvider>
  );
}

/**
 * A pillar's tab icon, crowned with a small gold point once that pillar is done
 * for the day — the nav becomes a summary of the day you can read with a thumb.
 */
function PillarTabIcon({ k, children }: { k: PillarKey; children: React.ReactNode }) {
  const { pillars } = usePillars();
  const done = pillarComplete(pillars[k]);
  return (
    <View>
      {children}
      {done ? (
        <View
          style={{
            position: "absolute",
            top: -3,
            right: -6,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: color.goldHi,
          }}
        />
      ) : null}
    </View>
  );
}

function TabsInner() {
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
        name="body"
        options={{
          title: t("tab_body"),
          tabBarActiveTintColor: pillar.body,
          tabBarIcon: ({ color: c }) => (
            <PillarTabIcon k="body">
              <DumbbellIcon color={c} />
            </PillarTabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="mind"
        options={{
          title: t("tab_mind"),
          tabBarActiveTintColor: pillar.mind,
          tabBarIcon: ({ color: c }) => (
            <PillarTabIcon k="mind">
              <LotusIcon color={c} />
            </PillarTabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="soul"
        options={{
          title: t("tab_soul"),
          tabBarActiveTintColor: pillar.soul,
          tabBarIcon: ({ color: c }) => (
            <PillarTabIcon k="soul">
              <OmGlyph color={c} size={20} />
            </PillarTabIcon>
          ),
        }}
      />
      {/* module screens — reachable only through their pillar (or deep links) */}
      <Tabs.Screen name="workout" options={{ href: null }} />
      <Tabs.Screen name="diet" options={{ href: null }} />
      <Tabs.Screen name="meditation" options={{ href: null }} />
      <Tabs.Screen name="jap" options={{ href: null }} />
      <Tabs.Screen name="sleep" options={{ href: null }} />
    </Tabs>
  );
}
