import { Elysia, t } from "elysia";
import type { ChatService } from "../../../../modules/chat/chat.service.ts";

export class ChatController {
  constructor(private readonly service: ChatService) {}

  routes() {
    return new Elysia({ prefix: "/agent" })
      .post("/start", async ({ set }) => {
        set.status = 201;
        return this.service.startSession();
      })
      .post(
        "/message",
        ({ body }) => this.service.sendMessage(body.sessionId, body.message),
        {
          body: t.Object({
            sessionId: t.String(),
            message: t.String(),
          }),
        },
      )
      .get("/sessions", () => this.service.listSessions())
      .get("/history/:sessionId", async ({ params }) => ({
        sessionId: params.sessionId,
        messages: await this.service.getHistory(params.sessionId),
      }))
      .get("/session/:sessionId", ({ params }) =>
        this.service.getSession(params.sessionId),
      )
      .delete("/session/:sessionId", async ({ params, set }) => {
        await this.service.deleteSession(params.sessionId);
        set.status = 204;
      });
  }
}
