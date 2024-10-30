import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = (await clientPromise).db();
  const subscription = await db.collection("subscriptions").findOne({
    userId: session.user.id,
  });

  if (!subscription?.status === "active") {
    return NextResponse.json(
      { error: "Active subscription required" },
      { status: 403 }
    );
  }

  if (
    subscription.monthlyQuota !== -1 && // -1 means unlimited
    subscription.currentUsage >= subscription.monthlyQuota
  ) {
    return NextResponse.json(
      { error: "Monthly quota exceeded" },
      { status: 403 }
    );
  }

  const body = await req.json();
  
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error("OpenAI API error");
    }

    const data = await response.json();

    // Update usage
    if (subscription.monthlyQuota !== -1) {
      await db.collection("subscriptions").updateOne(
        { userId: session.user.id },
        { $inc: { currentUsage: 1 } }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}