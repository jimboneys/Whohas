import { useState, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  KeyboardAvoidingView, Platform, Keyboard, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { colors, fonts, spacing, radius, shadow } from "@/src/theme";
import { storage } from "@/src/utils/storage";
import { getComments, postComment, likeComment, Comment } from "@/src/api";

const NAME_KEY = "whohas_nickname";

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(null);
  const [posting, setPosting] = useState(false);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const inputRef = useRef<TextInput>(null);

  const load = useCallback(() => {
    setLoading(true);
    getComments()
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      storage.getItem(NAME_KEY, "").then((n) => n && setName(String(n)));
    }, [load])
  );

  const startReply = (c: Comment) => {
    Haptics.selectionAsync().catch(() => {});
    setReplyTo({ id: c.id, author: c.author });
    inputRef.current?.focus();
  };

  const onLike = async (c: Comment) => {
    if (liked[c.id]) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setLiked((l) => ({ ...l, [c.id]: true }));
    setComments((prev) => bump(prev, c.id));
    await likeComment(c.id);
  };

  const submit = async () => {
    const body = text.trim();
    if (!body || posting) return;
    const author = name.trim() || "Anonymous";
    setPosting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      await postComment(author, body, replyTo?.id);
      await storage.setItem(NAME_KEY, author);
      setName(author);
      setText("");
      setReplyTo(null);
      Keyboard.dismiss();
      load();
    } catch {
      /* ignore */
    } finally {
      setPosting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]} testID="community-header">
        <View>
          <Text style={styles.title}>Community</Text>
          <Text style={styles.subtitle}>Share deals & confirm prices 🛒</Text>
        </View>
        <Pressable onPress={load} hitSlop={10} testID="community-refresh">
          <Ionicons name="refresh" size={22} color={colors.brand} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : comments.length === 0 ? (
        <View style={styles.center} testID="community-empty">
          <Ionicons name="chatbubbles-outline" size={56} color="#D8D2C8" />
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptySub}>Be the first to share a deal you found!</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {comments.map((c) => (
            <View key={c.id} style={styles.thread} testID={`comment-${c.id}`}>
              <CommentRow c={c} onLike={onLike} onReply={startReply} liked={!!liked[c.id]} />
              {c.replies.length > 0 && (
                <View style={styles.replies}>
                  {c.replies.map((r) => (
                    <CommentRow key={r.id} c={r} onLike={onLike} onReply={startReply} liked={!!liked[r.id]} isReply />
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <View style={[styles.composer, { paddingBottom: insets.bottom + spacing.sm }]} testID="community-composer">
        {replyTo && (
          <View style={styles.replyBanner}>
            <Ionicons name="return-down-forward" size={14} color={colors.brand} />
            <Text style={styles.replyBannerText}>Replying to {replyTo.author}</Text>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={8} testID="cancel-reply">
              <Ionicons name="close-circle" size={16} color={colors.onSurfaceTertiary} />
            </Pressable>
          </View>
        )}
        <View style={styles.nameRow}>
          <View style={styles.avatarSm}>
            <Text style={styles.avatarSmText}>{initials(name || "?")}</Text>
          </View>
          <TextInput
            testID="community-name-input"
            style={styles.nameInput}
            placeholder="Your nickname"
            placeholderTextColor="#B5AFA5"
            value={name}
            onChangeText={setName}
            maxLength={40}
          />
        </View>
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            testID="community-text-input"
            style={styles.input}
            placeholder={replyTo ? "Write a reply…" : "Share a deal or ask the crowd…"}
            placeholderTextColor="#B5AFA5"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={600}
          />
          <Pressable
            testID="community-send"
            style={({ pressed }) => [styles.sendBtn, (pressed || posting) && { opacity: 0.7 }]}
            onPress={submit}
            disabled={posting}
          >
            <Ionicons name="send" size={18} color={colors.onBrand} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// Optimistically increment a comment's like in the (possibly nested) tree.
function bump(list: Comment[], id: string): Comment[] {
  return list.map((c) => {
    if (c.id === id) return { ...c, likes: c.likes + 1 };
    if (c.replies?.length) return { ...c, replies: bump(c.replies, id) };
    return c;
  });
}

function CommentRow({
  c, onLike, onReply, liked, isReply,
}: {
  c: Comment;
  onLike: (c: Comment) => void;
  onReply: (c: Comment) => void;
  liked: boolean;
  isReply?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.avatar, isReply && styles.avatarReply]}>
        <Text style={styles.avatarText}>{initials(c.author)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.metaRow}>
          <Text style={styles.author}>{c.author}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.time}>{timeAgo(c.created_at)}</Text>
        </View>
        <Text style={styles.body}>{c.text}</Text>
        <View style={styles.actionsRow}>
          <Pressable style={styles.action} onPress={() => onLike(c)} hitSlop={8} testID={`like-${c.id}`}>
            <Ionicons name={liked ? "heart" : "heart-outline"} size={15} color={liked ? colors.brand : colors.onSurfaceTertiary} />
            <Text style={[styles.actionText, liked && { color: colors.brand }]}>{c.likes > 0 ? c.likes : ""} Like</Text>
          </Pressable>
          {!isReply && (
            <Pressable style={styles.action} onPress={() => onReply(c)} hitSlop={8} testID={`reply-${c.id}`}>
              <Ionicons name="chatbubble-outline" size={14} color={colors.onSurfaceTertiary} />
              <Text style={styles.actionText}>Reply</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    paddingHorizontal: spacing.xl, paddingBottom: spacing.md,
  },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.onSurface },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.onSurfaceTertiary, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.xl },
  emptyTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.onSurface, marginTop: spacing.sm },
  emptySub: { fontFamily: fonts.body, fontSize: 14, color: colors.onSurfaceTertiary },
  thread: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadow.soft,
  },
  replies: {
    marginTop: spacing.md, marginLeft: spacing.lg, paddingLeft: spacing.md,
    borderLeftWidth: 2, borderLeftColor: colors.border, gap: spacing.md,
  },
  row: { flexDirection: "row", gap: spacing.md },
  avatar: {
    width: 38, height: 38, borderRadius: radius.pill, backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  avatarReply: { width: 30, height: 30, backgroundColor: colors.surfaceTertiary },
  avatarText: { fontFamily: fonts.bodyExtra, fontSize: 13, color: colors.brand },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  author: { fontFamily: fonts.bodyExtra, fontSize: 14, color: colors.onSurface },
  dot: { color: colors.onSurfaceTertiary },
  time: { fontFamily: fonts.body, fontSize: 12.5, color: colors.onSurfaceTertiary },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.onSurface, marginTop: 3 },
  actionsRow: { flexDirection: "row", gap: spacing.xl, marginTop: spacing.sm },
  action: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.onSurfaceTertiary },
  composer: {
    backgroundColor: colors.surfaceSecondary, borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm,
  },
  replyBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.brandTertiary, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignSelf: "flex-start",
  },
  replyBannerText: { flex: 0, fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.brand },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatarSm: {
    width: 28, height: 28, borderRadius: radius.pill, backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  avatarSmText: { fontFamily: fonts.bodyExtra, fontSize: 11, color: colors.brand },
  nameInput: {
    flex: 1, fontFamily: fonts.bodyBold, fontSize: 14, color: colors.onSurface, paddingVertical: 4,
  },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  input: {
    flex: 1, fontFamily: fonts.body, fontSize: 15, lineHeight: 20, color: colors.onSurface,
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, maxHeight: 110,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
  },
});
