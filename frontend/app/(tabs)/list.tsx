import { useState, useCallback, useEffect, useRef } from "react";
import {
  View, Text, TextInput, StyleSheet, ScrollView, Pressable,
  KeyboardAvoidingView, Platform, Keyboard, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";

import { colors, fonts, spacing, radius, shadow, money } from "@/src/theme";
import { getList, saveList } from "@/src/grocery";
import { computeBasket, BasketResponse } from "@/src/api";

const SUGGESTED = [
  "Eggs", "Milk", "Bread", "Bananas", "Chicken", "Rice", "Pasta",
  "Cheese", "Cereal", "Coffee", "Paper towels", "Toilet paper",
];

export default function ListScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [basket, setBasket] = useState<BasketResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    useCallback(() => {
      getList().then(setItems);
    }, [])
  );

  // Persist + recompute the cheapest basket whenever the list changes.
  useEffect(() => {
    saveList(items);
    if (debounce.current) clearTimeout(debounce.current);
    if (items.length === 0) {
      setBasket(null);
      setBusy(false);
      return;
    }
    setBusy(true);
    debounce.current = setTimeout(() => {
      computeBasket(items)
        .then((b) => setBasket(b))
        .catch(() => setBasket(null))
        .finally(() => setBusy(false));
    }, 400);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [items]);

  const addItem = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    const exists = items.some((i) => i.toLowerCase() === v.toLowerCase());
    if (exists) {
      setText("");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setItems((prev) => [v, ...prev].slice(0, 40));
    setText("");
  };

  const removeItem = (name: string) => {
    Haptics.selectionAsync().catch(() => {});
    setItems((prev) => prev.filter((i) => i !== name));
  };

  const clearAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setItems([]);
    Keyboard.dismiss();
  };

  const availableChips = SUGGESTED.filter(
    (s) => !items.some((i) => i.toLowerCase() === s.toLowerCase())
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]} testID="list-header">
        <View>
          <Text style={styles.title}>My List</Text>
          <Text style={styles.subtitle}>Find the cheapest basket 🛒</Text>
        </View>
        {items.length > 0 && (
          <Pressable onPress={clearAll} testID="clear-list-button" hitSlop={10}>
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.addCard} testID="add-item-card">
          <Ionicons name="add-circle" size={22} color={colors.brand} />
          <TextInput
            testID="add-item-input"
            style={styles.input}
            placeholder="Add an item…"
            placeholderTextColor="#B5AFA5"
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => addItem(text)}
            returnKeyType="done"
          />
          <Pressable
            testID="add-item-button"
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
            onPress={() => addItem(text)}
          >
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>

        {availableChips.length > 0 && (
          <View style={styles.chipWrap}>
            {availableChips.map((s) => (
              <Pressable
                key={s}
                testID={`suggest-chip-${s}`}
                style={styles.chip}
                onPress={() => addItem(s)}
              >
                <Ionicons name="add" size={14} color={colors.onBrandTertiary} />
                <Text style={styles.chipText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {items.length === 0 ? (
          <View style={styles.empty} testID="list-empty">
            <Ionicons name="cart-outline" size={56} color="#D1CCC2" />
            <Text style={styles.emptyTitle}>Your list is empty</Text>
            <Text style={styles.emptySub}>Add items above to see who has the cheapest basket.</Text>
          </View>
        ) : (
          <>
            {/* Cheapest basket summary */}
            {basket?.cheapest && (
              <View style={styles.summaryCard} testID="basket-summary">
                <View style={styles.summaryTop}>
                  <View style={styles.trophy}>
                    <Ionicons name="trophy" size={20} color={colors.onBrand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryLabel}>CHEAPEST BASKET</Text>
                    <Text style={styles.summaryStore}>{basket.cheapest.store}</Text>
                  </View>
                  <Text style={styles.summaryTotal}>{money(basket.cheapest.total)}</Text>
                </View>
                {basket.cheapest.savings > 0 && (
                  <View style={styles.savingsPill}>
                    <Ionicons name="pricetag" size={13} color={colors.onSuccess} />
                    <Text style={styles.savingsText}>
                      Save {money(basket.cheapest.savings)} vs the priciest store
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Store comparison bars */}
            {basket && basket.totals.length > 0 && (
              <View style={styles.compareCard} testID="store-compare">
                <View style={styles.compareHead}>
                  <Text style={styles.sectionLabel}>STORE COMPARISON</Text>
                  {busy && <ActivityIndicator size="small" color={colors.brand} />}
                </View>
                {basket.totals.map((t, idx) => {
                  const max = basket.totals[basket.totals.length - 1].total || 1;
                  const pct = Math.max(0.25, t.total / max);
                  const best = idx === 0;
                  return (
                    <View key={t.store} style={styles.storeRow} testID={`store-total-${t.store}`}>
                      <View style={styles.storeRowTop}>
                        <Text style={[styles.storeName, best && { color: colors.onSurface }]}>
                          {t.store}{best ? "  🏆" : ""}
                        </Text>
                        <Text style={[styles.storeTotal, best && styles.storeTotalBest]}>
                          {money(t.total)}
                        </Text>
                      </View>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${pct * 100}%`, backgroundColor: best ? colors.success : colors.borderStrong },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
                {basket.best_mix_total > 0 && basket.cheapest &&
                  basket.best_mix_total < basket.cheapest.total && (
                    <View style={styles.mixNote}>
                      <Ionicons name="git-compare-outline" size={14} color={colors.brand} />
                      <Text style={styles.mixText}>
                        Split across stores for {money(basket.best_mix_total)} total (max savings)
                      </Text>
                    </View>
                  )}
              </View>
            )}

            {/* Item rows with best price */}
            <Text style={styles.sectionLabel}>{items.length} ITEM{items.length > 1 ? "S" : ""}</Text>
            {items.map((name) => {
              const info = basket?.items.find(
                (b) => b.name.toLowerCase() === name.toLowerCase()
              );
              return (
                <View key={name} style={styles.itemRow} testID={`item-row-${name}`}>
                  {info ? (
                    <Image source={{ uri: info.image }} style={styles.itemImg} contentFit="cover" />
                  ) : (
                    <View style={[styles.itemImg, styles.itemImgPlaceholder]}>
                      <Ionicons name="basket-outline" size={18} color="#C9C3B8" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={1}>{name}</Text>
                    {info && (
                      <Text style={styles.itemBest}>
                        {money(info.best_price)} at {info.best_store}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    testID={`remove-item-${name}`}
                    onPress={() => removeItem(name)}
                    hitSlop={8}
                    style={styles.removeBtn}
                  >
                    <Ionicons name="close" size={16} color={colors.onSurfaceTertiary} />
                  </Pressable>
                </View>
              );
            })}

            <Text style={styles.disclaimer}>
              Prices are estimates for comparison. Actual in-store prices may vary.
            </Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    paddingHorizontal: spacing.xl, paddingBottom: spacing.md,
  },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.onSurface },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.onSurfaceTertiary, marginTop: 1 },
  clear: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.brand },
  addCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.pill,
    paddingLeft: spacing.lg, paddingRight: spacing.xs, paddingVertical: spacing.xs,
    borderWidth: 1, borderColor: colors.border, ...shadow.card, marginBottom: spacing.md,
  },
  input: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 16, color: colors.onSurface, paddingVertical: spacing.sm },
  addBtn: {
    backgroundColor: colors.brand, borderRadius: radius.pill,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  addBtnText: { fontFamily: fonts.bodyExtra, fontSize: 14, color: colors.onBrand },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: colors.brandTertiary, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.onBrandTertiary },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxxl, gap: spacing.xs },
  emptyTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.onSurface, marginTop: spacing.sm },
  emptySub: { fontFamily: fonts.body, fontSize: 14, color: colors.onSurfaceTertiary, textAlign: "center", paddingHorizontal: spacing.xl },
  summaryCard: {
    backgroundColor: colors.brand, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: spacing.lg, ...shadow.card,
  },
  summaryTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  trophy: {
    width: 40, height: 40, borderRadius: radius.md, backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center", justifyContent: "center",
  },
  summaryLabel: { fontFamily: fonts.bodyExtra, fontSize: 11, letterSpacing: 1, color: "rgba(255,255,255,0.85)" },
  summaryStore: { fontFamily: fonts.display, fontSize: 22, color: colors.onBrand },
  summaryTotal: { fontFamily: fonts.display, fontSize: 26, color: colors.onBrand },
  savingsPill: {
    flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start",
    backgroundColor: colors.successSoft, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 5, marginTop: spacing.md,
  },
  savingsText: { fontFamily: fonts.bodyExtra, fontSize: 12.5, color: colors.onSuccess },
  compareCard: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  compareHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionLabel: {
    fontFamily: fonts.bodyExtra, fontSize: 12, letterSpacing: 1, color: colors.onSurfaceTertiary,
    marginBottom: spacing.md, marginTop: spacing.xs,
  },
  storeRow: { marginBottom: spacing.md },
  storeRowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  storeName: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.onSurfaceTertiary },
  storeTotal: { fontFamily: fonts.bodyExtra, fontSize: 15, color: colors.onSurfaceTertiary },
  storeTotalBest: { color: colors.success, fontSize: 16 },
  barTrack: { height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary, overflow: "hidden" },
  barFill: { height: 8, borderRadius: radius.pill },
  mixNote: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.xs,
    paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider,
  },
  mixText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.onSurfaceTertiary },
  itemRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    padding: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  itemImg: { width: 46, height: 46, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
  itemImgPlaceholder: { alignItems: "center", justifyContent: "center" },
  itemName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onSurface },
  itemBest: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.success, marginTop: 1 },
  removeBtn: {
    width: 30, height: 30, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary,
    alignItems: "center", justifyContent: "center",
  },
  disclaimer: {
    fontFamily: fonts.body, fontSize: 11.5, color: "#A8A29A", textAlign: "center",
    marginTop: spacing.lg, paddingHorizontal: spacing.md, lineHeight: 16,
  },
});
