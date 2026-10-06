import { createFileRoute } from "@tanstack/react-router";
import { Game } from "@/components/Game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UNILAG Life — Campus Life Simulator" },
      { name: "description", content: "Live the University of Lagos experience: hostels, New Hall food, SUG elections, CBT exams, TDB nights and hall week." },
      { property: "og:title", content: "UNILAG Life — Campus Life Simulator" },
      { property: "og:description", content: "A social campus life game set in the University of Lagos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});
