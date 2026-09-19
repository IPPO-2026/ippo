import { describe, it, expect } from "vitest";
import { extractMissionReply } from "../worker/policy";
import { demoMission, isCrisisText, validMission } from "../src/chat-missions";
describe("conversation missions", () => {
  it("extracts one allowed model proposal and removes protocol markup", () => {
    expect(
      extractMissionReply({
        response: "물 한 모금은 어떨까요? [[mission:water]]",
      }),
    ).toEqual({ message: "물 한 모금은 어떨까요?", mission: "water" });
  });
  it("does not invent a mission from ordinary chat", () => {
    expect(extractMissionReply({ response: "오늘은 어땠나요?" })).toEqual({
      message: "오늘은 어땠나요?",
    });
  });
  it("rejects unknown, multiple and empty proposals", () => {
    expect(
      extractMissionReply({ response: "hello [[mission:unsafe]]" }),
    ).toEqual({ message: "hello" });
    expect(
      extractMissionReply({
        response: "hello [[mission:water]] [[mission:walk]]",
      }),
    ).toEqual({ message: "hello" });
    expect(extractMissionReply({ response: "[[mission:water]]" })).toBeNull();
  });
  it("only allows known persisted actions", () => {
    expect(validMission({ id: "water", status: "completed" })).toBe(true);
    expect(validMission({ id: "arbitrary", status: "active" })).toBe(false);
    expect(validMission({ id: "water", status: "bad" })).toBe(false);
  });
  it("keeps demo suggestions context based and excludes crisis phrases", () => {
    expect(demoMission("조금 지친 것 같아요", 0)).toBe("water");
    expect(demoMission("죽고 싶어요", 1)).toBeUndefined();
    expect(isCrisisText("死にたい")).toBe(true);
    expect(isCrisisText("오늘은 피곤해요")).toBe(false);
  });
});

import { canSuggestMission } from "../src/chat-missions";
import { parseChatRequest, systemPrompt } from "../worker/policy";
const user = (content = "오늘 이야기를 더 하고 싶어요") => ({ role: "user", content });
const proposal = (status: "suggested" | "active" | "completed" | "deferred") => ({
  role: "assistant", content: "작은 한 걸음", mission: { id: "water" as const, status },
});
describe("mission pacing", () => {
  it("listens for the first three turns, then allows an optional proposal", () => {
    expect(canSuggestMission(Array.from({ length: 3 }, () => user()))).toBe(false);
    expect(canSuggestMission(Array.from({ length: 4 }, () => user()))).toBe(true);
  });
  it("waits five turns after a suggestion or completion and eight after deferral", () => {
    for (const status of ["suggested", "completed", "deferred"] as const) {
      const gap = status === "deferred" ? 8 : 5;
      expect(canSuggestMission([proposal(status), ...Array.from({length: gap - 1}, () => user())])).toBe(false);
      expect(canSuggestMission([proposal(status), ...Array.from({length: gap}, () => user())])).toBe(true);
    }
  });
  it("honors explicit Korean/Japanese requests but not refusal, crisis or active missions", () => {
    for (const content of ["작은 미션을 제안해 주세요", "小さな一歩を提案してください"]) {
      expect(canSuggestMission([user(content)])).toBe(true);
      expect(canSuggestMission([proposal("active"), user(content)])).toBe(false);
    }
    for (const content of ["미션 말고 대화하고 싶어요", "미션은 나중에 추천해 주세요", "ミッションはいらない", "죽고 싶어요"]) {
      expect(canSuggestMission(Array.from({length: 12}, () => user(content)))).toBe(false);
    }
  });
  it("suppresses model markers when the current turn is not eligible", () => {
    expect(extractMissionReply({response: "이야기해주세요 [[mission:water]]"}, false)).toEqual({message: "이야기해주세요"});
    const body = {locale: "ko", region: "KR", consent: true, messages: [user()]};
    expect(parseChatRequest({...body, allowMission: "true"})).toBeNull();
    expect(systemPrompt(parseChatRequest(body)!)).toContain("No mission this turn");
    expect(systemPrompt(parseChatRequest({...body, allowMission: true})!)).toContain("A mission is eligible");
  });
});
