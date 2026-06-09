import { createStorageSignedUrlMap } from "@/lib/storage";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Flashcard, Json } from "@/lib/types/database";

export const FLASHCARD_MEDIA_BUCKET = "flashcard_media";
export const FLASHCARD_MEDIA_PREFIX = "questions";

export type FlashcardQuestionType =
  | "classic_flashcard"
  | "multiple_choice"
  | "yes_no"
  | "open_answer";

export interface MultipleChoiceOption {
  id: string;
  text: string;
}

export interface DeckSubjectRef {
  id: string;
  slug: string;
  name: string;
  short_tag: string;
  faculty: string | null;
}

export type EditableFlashcardQuestion = FlashcardQuestion & {
  media_url: string | null;
}

export type FlashcardWithMediaUrl = Flashcard & {
  media_url?: string | null;
}

export interface ClassicFlashcardAnswerData {
  answerText: string;
}

export interface MultipleChoiceAnswerData {
  options: MultipleChoiceOption[];
  correctOptionIds: string[];
}

export interface YesNoAnswerData {
  correct: boolean;
}

export interface OpenAnswerData {
  answerText: string;
}

export type FlashcardAnswerData =
  | ClassicFlashcardAnswerData
  | MultipleChoiceAnswerData
  | YesNoAnswerData
  | OpenAnswerData;

interface FlashcardQuestionBase extends Omit<FlashcardWithMediaUrl, "question_type" | "prompt" | "answer_data" | "media_path"> {
  prompt: string;
  media_path: string | null;
}

export interface ClassicFlashcardQuestion extends FlashcardQuestionBase {
  question_type: "classic_flashcard";
  answer_data: ClassicFlashcardAnswerData;
}

export interface MultipleChoiceQuestion extends FlashcardQuestionBase {
  question_type: "multiple_choice";
  answer_data: MultipleChoiceAnswerData;
}

export interface YesNoQuestion extends FlashcardQuestionBase {
  question_type: "yes_no";
  answer_data: YesNoAnswerData;
}

export interface OpenAnswerQuestion extends FlashcardQuestionBase {
  question_type: "open_answer";
  answer_data: OpenAnswerData;
}

export type FlashcardQuestion =
  | ClassicFlashcardQuestion
  | MultipleChoiceQuestion
  | YesNoQuestion
  | OpenAnswerQuestion;

export function isQuestionType(value: string | null | undefined): value is FlashcardQuestionType {
  return value === "classic_flashcard" || value === "multiple_choice" || value === "yes_no" || value === "open_answer";
}

export function normalizeFlashcard(card: FlashcardWithMediaUrl): FlashcardQuestion {
  const questionType: FlashcardQuestionType = isQuestionType(card.question_type)
    ? card.question_type
    : "classic_flashcard";

  const prompt = card.prompt?.trim() || card.front;
  const mediaPath = card.media_path ?? null;
  const rawAnswer = card.answer_data as Json;

  if (questionType === "multiple_choice") {
    const optionsRaw = Array.isArray((rawAnswer as { options?: Json[] } | null)?.options)
      ? ((rawAnswer as { options: Json[] }).options)
      : [];
    const options = optionsRaw
      .map((option, index) => {
        const data = option as { id?: string; text?: string };
        return {
          id: data.id || `option-${index + 1}`,
          text: typeof data.text === "string" ? data.text : "",
        };
      })
      .filter((option) => option.text.trim().length > 0);
    const correctOptionIdsRaw = Array.isArray((rawAnswer as { correctOptionIds?: Json[] } | null)?.correctOptionIds)
      ? ((rawAnswer as { correctOptionIds: Json[] }).correctOptionIds)
      : [];
    const correctOptionIds = correctOptionIdsRaw.filter((id): id is string => typeof id === "string");

    return {
      ...card,
      question_type: questionType,
      prompt,
      media_path: mediaPath,
      answer_data: {
        options,
        correctOptionIds,
      },
    };
  }

  if (questionType === "yes_no") {
    return {
      ...card,
      question_type: questionType,
      prompt,
      media_path: mediaPath,
      answer_data: {
        correct: Boolean((rawAnswer as { correct?: boolean } | null)?.correct),
      },
    };
  }

  const fallbackAnswer = card.back;
  const answerText = typeof (rawAnswer as { answerText?: string } | null)?.answerText === "string"
    ? ((rawAnswer as { answerText: string }).answerText)
    : fallbackAnswer;

  return {
    ...card,
    question_type: questionType,
    prompt,
    media_path: mediaPath,
    answer_data: {
      answerText,
    },
  };
}

export function getFlashcardAnswerText(card: FlashcardQuestion): string {
  if (card.question_type === "yes_no") {
    return card.answer_data.correct ? "Ano" : "Ne";
  }
  if (card.question_type === "multiple_choice") {
    const options = card.answer_data.options
      .filter((option) => card.answer_data.correctOptionIds.includes(option.id))
      .map((option) => option.text);
    return options.join(", ");
  }
  return card.answer_data.answerText;
}

export function getQuestionTypeLabel(questionType: FlashcardQuestionType): string {
  switch (questionType) {
    case "classic_flashcard":
      return "Kartička";
    case "multiple_choice":
      return "Výběr odpovědí";
    case "yes_no":
      return "Ano / Ne";
    case "open_answer":
      return "Otevřená odpověď";
  }
}

export function areOptionSetsEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();
  return leftSorted.every((value, index) => value === rightSorted[index]);
}

export function getFlashcardMediaUrl(card: Pick<FlashcardWithMediaUrl, "media_path" | "media_url"> | null): string | null {
  if (!card) return null;
  return card.media_url ?? null;
}

export function getFlashcardMediaBucket(mediaPath: string | null | undefined): string {
  void mediaPath;
  return FLASHCARD_MEDIA_BUCKET;
}

export function groupFlashcardMediaPaths(
  paths: Array<string | null | undefined>,
): Array<{ bucket: string; paths: string[] }> {
  const grouped = new Map<string, string[]>();

  for (const path of paths) {
    if (!path) continue;
    const bucket = getFlashcardMediaBucket(path);
    const bucketPaths = grouped.get(bucket) ?? [];
    if (!bucketPaths.includes(path)) {
      bucketPaths.push(path);
    }
    grouped.set(bucket, bucketPaths);
  }

  return Array.from(grouped.entries(), ([bucket, bucketPaths]) => ({
    bucket,
    paths: bucketPaths,
  }));
}

export async function withFlashcardMediaUrls<T extends FlashcardWithMediaUrl>(
  supabase: Pick<SupabaseClient, "storage">,
  cards: T[],
): Promise<Array<T & { media_url: string | null }>> {
  const signedUrls = await createStorageSignedUrlMap(
    supabase,
    FLASHCARD_MEDIA_BUCKET,
    cards.map((card) => card.media_path),
  );

  return cards.map((card) => ({
    ...card,
    media_url: card.media_path ? signedUrls.get(card.media_path) ?? null : null,
  }));
}
