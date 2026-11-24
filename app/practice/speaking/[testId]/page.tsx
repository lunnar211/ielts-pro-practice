import { notFound } from "next/navigation";
import SpeakingExam from "@/components/SpeakingExam";
import { getTest } from "@/lib/seed";

export default function SpeakingTestPage({
  params,
}: {
  params: { testId: string };
}) {
  const test = getTest(params.testId);
  if (!test) notFound();

  return <SpeakingExam test={test} />;
}
