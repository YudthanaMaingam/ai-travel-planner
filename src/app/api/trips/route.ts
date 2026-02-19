import dbConnect from "@/lib/mongodb";
import Trip from "@/models/Trip";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await dbConnect();
    const trips = await Trip.find({}).sort({ createdAt: -1 });
    return NextResponse.json(trips);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const trip = await Trip.create(body);
    return NextResponse.json(trip, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
