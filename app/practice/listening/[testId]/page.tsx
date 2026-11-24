import { notFound } from "next/navigation";
import ListeningExam from "@/components/ListeningExam";
import { getTest } from "@/lib/seed";

export default function ListeningTestPage({
  params,
}: {
  params: { testId: string };
}) {
  const test = getTest(params.testId);
  if (!test) {
    notFound();
  }
  return <ListeningExam test={test} />;
}
