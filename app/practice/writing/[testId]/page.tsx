import { notFound } from "next/navigation";
import WritingExam from "@/components/WritingExam";
import { getTest } from "@/lib/seed";

export default function WritingTestPage({
  params,
}: {
  params: { testId: string };
}) {
  const test = getTest(params.testId);
  if (!test) notFound();

  return <WritingExam test={test} />;
}
