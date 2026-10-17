import { Elysia, t } from "elysia";
import type { UserService } from "../../../../modules/users/user.service.ts";

export class UserController {
  constructor(private readonly service: UserService) {}

  routes() {
    return new Elysia({ prefix: "/users" })
      .get("/", () => this.service.list())
      .get("/:id", ({ params }) => this.service.get(params.id))
      .post(
        "/",
        ({ body, set }) => {
          set.status = 201;
          return this.service.create(body);
        },
        {
          body: t.Object({
            name: t.String(),
            email: t.String(),
          }),
        },
      )
      .patch(
        "/:id",
        ({ params, body }) => this.service.update(params.id, body),
        {
          body: t.Object({
            name: t.Optional(t.String()),
            email: t.Optional(t.String()),
          }),
        },
      )
      .delete("/:id", async ({ params, set }) => {
        await this.service.remove(params.id);
        set.status = 204;
      });
  }
}
