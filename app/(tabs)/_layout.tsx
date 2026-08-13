import React from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, pillar, type PillarKey } from "../../src/ui";
import { HomeIcon, DumbbellIcon, LotusIcon, OmGlyph } from "../../src/ui/icons";
import { useI18n } from "../../src/lib/i18n";
import { feedback } from "../../src/lib/feedback";
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
function PillarTabIcon({
  k,
  focused,
  children,
}: {
  k: PillarKey;
  focused: boolean;
  children: React.ReactNode;
}) {
  const { pillars } = usePillars();
  const done = pillarComplete(pillars[k]);
  return (
    <TabLift focused={focused}>
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
    </TabLift>
  );
}

/** The mockup's active-tab lift: the icon rises 2dp and grows a touch when its
 *  tab is focused — enough to feel alive, cheap enough to be free. */
function TabLift({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  return (
    <View style={{ transform: [{ translateY: focused ? -2 : 0 }, { scale: focused ? 1.08 : 1 }] }}>
      {children}
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
      // The mockup wires a selection tick on every tab press — the nav is a
      // tappable surface like any other, so it speaks the same haptic language.
      screenListeners={{ tabPress: () => feedback.select() }}
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
          tabBarIcon: ({ color: c, focused }) => (
            <TabLift focused={focused}>
              <HomeIcon color={c} />
            </TabLift>
          ),
        }}
      />
      <Tabs.Screen
        name="body"
        options={{
          title: t("tab_body"),
          tabBarActiveTintColor: pillar.body,
          tabBarIcon: ({ color: c, focused }) => (
            <PillarTabIcon k="body" focused={focused}>
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
          tabBarIcon: ({ color: c, focused }) => (
            <PillarTabIcon k="mind" focused={focused}>
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
          tabBarIcon: ({ color: c, focused }) => (
            <PillarTabIcon k="soul" focused={focused}>
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
