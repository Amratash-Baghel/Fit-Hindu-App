import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Button, FooterAction, SelectCard, NumberField, B, T, space } from "../../src/ui";
import { useI18n, type StringKey } from "../../src/lib/i18n";
import { submitDietRequest } from "../../src/lib/diet";

const REGIONS: { value: string; k: StringKey }[] = [
  { value: "north", k: "region_north" },
  { value: "south", k: "region_south" },
  { value: "east", k: "region_east" },
  { value: "west", k: "region_west" },
  { value: "central", k: "region_central" },
  { value: "northeast", k: "region_northeast" },
];
const GOALS: { value: string; k: StringKey }[] = [
  { value: "weight_gain", k: "goal_weight_gain" },
  { value: "strength", k: "goal_strength" },
  { value: "weight_loss", k: "goal_weight_loss" },
  { value: "healthy_routine", k: "goal_healthy_routine" },
];
const DIETS: { value: string; k: StringKey }[] = [
  { value: "veg", k: "diet_veg" },
  { value: "sattvic", k: "diet_sattvic" },
  { value: "egg", k: "diet_egg" },
  { value: "nonveg", k: "diet_nonveg" },
];
const ACTIVITY: { value: string; k: StringKey }[] = [
  { value: "sedentary", k: "activity_sedentary" },
  { value: "moderate", k: "activity_moderate" },
  { value: "active", k: "activity_active" },
];

export default function DietQuestionnaire() {
  const { t, tSub } = useI18n();
  const router = useRouter();

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [region, setRegion] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [diet, setDiet] = useState<string | null>(null);
  const [activity, setActivity] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<StringKey | null>(null);

  const ready = height !== "" && weight !== "" && region && goal && diet && activity;

  async function submit() {
    setBusy(true);
    setNote(null);
    const res = await submitDietRequest({
      height_cm: height === "" ? null : Number(height),
      weight_kg: weight === "" ? null : Number(weight),
      region,
      goal,
      diet_type: diet,
      activity_level: activity,
    });
    setBusy(false);
    if (res.ok) {
      router.replace({ pathname: "/diet/plan", params: { request: res.id } });
    } else if (res.reason === "auth") {
      setNote("auth_required_note");
    } else {
      setNote("error_generic");
    }
  }

  return (
    <Screen scroll={false}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: space.md, paddingVertical: space.md }}>
        <B k="diet_generate_title" variant="h1" />
        <B k="diet_ai_disclaimer" variant="caption" tone="muted" />

        <View style={{ flexDirection: "row", gap: space.md }}>
          <View style={{ flex: 1 }}>
            <NumberField label={t("dq_height")} value={height} onChangeText={setHeight} suffix="cm" maxLength={3} />
          </View>
          <View style={{ flex: 1 }}>
            <NumberField label={t("dq_weight")} value={weight} onChangeText={setWeight} suffix="kg" maxLength={3} />
          </View>
        </View>

        <B k="dq_region" variant="h2" style={{ marginTop: space.sm }} />
        {REGIONS.map((o) => (
          <SelectCard key={o.value} title={t(o.k)} sub={tSub(o.k)} selected={region === o.value} onPress={() => setRegion(o.value)} />
        ))}

        <B k="q_goal" variant="h2" style={{ marginTop: space.sm }} />
        {GOALS.map((o) => (
          <SelectCard key={o.value} title={t(o.k)} sub={tSub(o.k)} selected={goal === o.value} onPress={() => setGoal(o.value)} />
        ))}

        <B k="q_diet" variant="h2" style={{ marginTop: space.sm }} />
        {DIETS.map((o) => (
          <SelectCard key={o.value} title={t(o.k)} sub={tSub(o.k)} selected={diet === o.value} onPress={() => setDiet(o.value)} />
        ))}

        <B k="dq_activity" variant="h2" style={{ marginTop: space.sm }} />
        {ACTIVITY.map((o) => (
          <SelectCard key={o.value} title={t(o.k)} sub={tSub(o.k)} selected={activity === o.value} onPress={() => setActivity(o.value)} />
        ))}

        {note ? <B k={note} variant="caption" tone="muted" /> : null}
      </ScrollView>

      <FooterAction>
        <Button k="dq_submit" onPress={submit} disabled={!ready || busy} />
      </FooterAction>
    </Screen>
  );
}
