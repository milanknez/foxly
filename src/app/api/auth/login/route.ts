import { NextResponse } from "next/server";
import { POST as authPost } from "../route";

export async function POST(request: Request) {
  return authPost(request);
}
