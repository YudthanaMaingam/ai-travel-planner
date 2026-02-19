import dbConnect from "@/lib/mongodb";
import Trip from "@/models/Trip";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const deletedTrip = await Trip.findByIdAndDelete(id);
    
    if (!deletedTrip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }
    
    return NextResponse.json({ message: "Trip deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
