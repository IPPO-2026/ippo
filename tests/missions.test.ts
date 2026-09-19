import { describe, it, expect } from "vitest";
import { extractMissionReply } from "../worker/policy";
import { demoMission, validMission } from "../src/chat-missions";
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
  });
});
