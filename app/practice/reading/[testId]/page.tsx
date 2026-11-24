import { notFound } from "next/navigation";
import ReadingExam from "@/components/ReadingExam";
import { getTest } from "@/lib/seed";

export default function ReadingTestPage({
  params,
}: {
  params: { testId: string };
}) {
  const test = getTest(params.testId);
  if (!test) notFound();

  return <ReadingExam test={test} />;
}
