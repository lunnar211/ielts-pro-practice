import { notFound } from "next/navigation";
import MockTest from "@/components/MockTest";
import { getTest } from "@/lib/seed";

export default function MockTestPage({
  params,
}: {
  params: { testId: string };
}) {
  const test = getTest(params.testId);
  if (!test) notFound();

  return <MockTest test={test} />;
}
