import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = (await clientPromise).db();
  const subscription = await db.collection("subscriptions").findOne({
    userId: session.user.id,
  });

  return NextResponse.json({ subscription });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planId } = await req.json();
  
  const db = (await clientPromise).db();
  const plan = await db.collection("plans").findOne({ id: planId });
  
  if (!plan) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // Create or update subscription
  await db.collection("subscriptions").updateOne(
    { userId: session.user.id },
    {
      $set: {
        planId,
        status: "active",
        monthlyQuota: plan.monthlyQuota,
        currentUsage: 0,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  const subscription = await db.collection("subscriptions").findOne({
    userId: session.user.id,
  });

  return NextResponse.json({ subscription });
}