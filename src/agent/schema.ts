import { z } from "zod";

const url = z.string().url().refine(v => ["http:","https:"].includes(new URL(v).protocol), "HTTP/HTTPS obrigatório");
const id = z.string().min(1).max(64);
const shortText = z.string().min(1).max(120);
const text = z.string().min(1).max(4096);

const buttonSchema = z
  .object({
    id,
    title: z.string().min(1).max(40),
    kind: z.enum(["reply", "quick_reply", "copy_code", "cta_url"]).default("reply"),
    code: z.string().max(160).optional(),
    url: url.optional(),
  })
  .superRefine((button, ctx) => {
    if (button.kind === "copy_code" && !button.code) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "copy_code exige code" });
    }
    if (button.kind === "cta_url" && !button.url) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "cta_url exige url" });
    }
  });

const textAction = z.object({
  type: z.literal("text"),
  text,
});

const buttonsAction = z.object({
  type: z.literal("buttons"),
  text,
  footer: z.string().max(120).optional(),
  buttons: z.array(buttonSchema).min(1).max(3),
});

const listAction = z.object({
  type: z.literal("list"),
  title: z.string().max(80).optional(),
  text,
  footer: z.string().max(120).optional(),
  buttonText: z.string().min(1).max(30),
  sections: z
    .array(
      z.object({
        title: z.string().min(1).max(80),
        rows: z
          .array(
            z.object({
              id,
              title: z.string().min(1).max(80),
              description: z.string().max(120).optional(),
            }),
          )
          .min(1)
          .max(10),
      }),
    )
    .min(1)
    .max(8),
});

const carouselAction = z.object({
  type: z.literal("carousel"),
  text,
  footer: z.string().max(120).optional(),
  cards: z
    .array(
      z.object({
        title: z.string().max(80).optional(),
        body: z.string().max(500).optional(),
        footer: z.string().max(120).optional(),
        imageUrl: url.optional(),
        videoUrl: url.optional(),
        buttons: z.array(buttonSchema).max(3).optional(),
      }).refine(c => Boolean(c.imageUrl) !== Boolean(c.videoUrl), "Um card exige imagem OU vídeo"),
    )
    .min(1)
    .max(10),
});

const imageAction = z.object({
  type: z.literal("image"),
  url: url,
  caption: z.string().max(1024).optional(),
});

const documentAction = z.object({
  type: z.literal("document"),
  url: url,
  fileName: z.string().min(1).max(160),
  mimetype: z.string().max(120).optional(),
  caption: z.string().max(1024).optional(),
});

const reactionAction = z.object({
  type: z.literal("reaction"),
  emoji: shortText,
  target: z.enum(["current"]).default("current"),
});

const locationAction = z.object({
  type: z.literal("location"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  name: z.string().max(120).optional(),
  address: z.string().max(240).optional(),
});

export const agentActionSchema = z.discriminatedUnion("type", [
  textAction,
  buttonsAction,
  listAction,
  carouselAction,
  imageAction,
  documentAction,
  reactionAction,
  locationAction,
]);

export const agentPlanSchema = z.object({
  actions: z.array(agentActionSchema).min(1).max(4),
}).superRefine((plan,ctx)=>{
 for(const a of plan.actions){
 if(a.type==='list'){const rows=a.sections.flatMap(s=>s.rows);if(rows.length>10||new Set(rows.map(r=>r.id)).size!==rows.length)ctx.addIssue({code:'custom',message:'Lista exige no máximo 10 IDs únicos'});}
 if(a.type==='buttons'&&new Set(a.buttons.map(b=>b.id)).size!==a.buttons.length)ctx.addIssue({code:'custom',message:'Botões exigem IDs únicos'});
 }
});

export type AgentPlan = z.infer<typeof agentPlanSchema>;
export type AgentAction = z.infer<typeof agentActionSchema>;
