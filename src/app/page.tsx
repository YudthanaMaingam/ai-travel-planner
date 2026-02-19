"use client";

import { useState, useEffect, useRef } from "react";
import { Map, MapMarker, MarkerContent, MarkerPopup, MapControls, MapRoute } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, MapPin, Calendar, Save, History, Plus, Image as ImageIcon } from "lucide-react";
import ReactMarkdown from 'react-markdown';

interface Location {
  name: string;
  lat: number;
  lng: number;
  day?: number;
  description?: string;
  imageUrl?: string | null;
}

interface TripPlan {
  _id?: string;
  title: string;
  destination: string;
  duration: string;
  plan: string;
  locations: Location[];
}

export default function TravelPlanner() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentTrip, setCurrentTrip] = useState<TripPlan | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [savedTrips, setSavedTrips] = useState<TripPlan[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [mapViewport, setMapViewport] = useState({
    center: [100.5231, 13.7367] as [number, number], // Bangkok
    zoom: 5,
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSavedTrips();
  }, []);

  // Auto scroll to bottom during streaming
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamingText]);

  const fetchSavedTrips = async () => {
    try {
      const res = await fetch("/api/trips");
      const data = await res.json();
      if (Array.isArray(data)) setSavedTrips(data);
    } catch (error) {
      console.error("Failed to fetch trips:", error);
    }
  };

  const getWikiImage = async (name: string) => {
    try {
      // Search Thai Wikipedia first
      const res = await fetch(`https://th.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(name)}&origin=*`);
      const data = await res.json();
      const pages = data.query.pages;
      const pageId = Object.keys(pages)[0];
      if (pageId !== "-1" && pages[pageId].original) {
        return pages[pageId].original.source;
      }
      // Fallback to English Wikipedia
      const resEn = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(name)}&origin=*`);
      const dataEn = await resEn.json();
      const pagesEn = dataEn.query.pages;
      const pageIdEn = Object.keys(pagesEn)[0];
      if (pageIdEn !== "-1" && pagesEn[pageIdEn].original) {
        return pagesEn[pageIdEn].original.source;
      }
    } catch (e) {
      console.error("Wiki error for:", name, e);
    }
    return null;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setStreamingText("");
    setCurrentTrip(null);
    
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        
        // Split text to show plan separately from hidden JSON
        const parts = fullText.split("---JSON_DATA---");
        setStreamingText(parts[0]);
      }

      // After stream is done, parse the JSON part
      const finalParts = fullText.split("---JSON_DATA---");
      if (finalParts.length > 1) {
        try {
          const jsonData = JSON.parse(finalParts[1].trim());
          
          // Fetch images for each location
          const locationsWithImages = await Promise.all(
            jsonData.locations.map(async (loc: any) => ({
              ...loc,
              imageUrl: await getWikiImage(loc.name)
            }))
          );

          const completedTrip = {
            ...jsonData,
            plan: finalParts[0],
            locations: locationsWithImages
          };

          setCurrentTrip(completedTrip);
          
          if (completedTrip.locations.length > 0) {
            setMapViewport({
              center: [completedTrip.locations[0].lng, completedTrip.locations[0].lat],
              zoom: 12,
            });
          }
        } catch (e) {
          console.error("JSON Parse error:", e);
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      alert("Failed to connect to AI");
    } finally {
      setIsLoading(false);
      setInput("");
    }
  };

  const saveTrip = async () => {
    if (!currentTrip || isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentTrip),
      });
      if (res.ok) {
        alert("Trip saved successfully!");
        fetchSavedTrips();
      }
    } catch (error) {
      alert("Failed to save trip");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrip = (trip: TripPlan) => {
    setCurrentTrip(trip);
    setStreamingText(trip.plan);
    if (trip.locations && trip.locations.length > 0) {
      setMapViewport({
        center: [trip.locations[0].lng, trip.locations[0].lat],
        zoom: 10,
      });
    }
    setShowHistory(false);
  };

  const routeCoordinates = currentTrip?.locations?.map(loc => [loc.lng, loc.lat] as [number, number]) || [];

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans">
      <header className="border-b p-4 flex justify-between items-center bg-card shadow-sm z-20">
        <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
          <MapPin className="text-primary fill-primary/20" /> <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">Travel AI Muse</span>
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)} className="rounded-full">
            <History className="mr-2 h-4 w-4" /> History
          </Button>
          {currentTrip && !currentTrip._id && (
            <Button size="sm" onClick={saveTrip} disabled={isLoading} className="rounded-full bg-gradient-to-r from-blue-600 to-primary">
              <Save className="mr-2 h-4 w-4" /> Save Plan
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => {setCurrentTrip(null); setStreamingText(""); setInput("");}} className="rounded-full">
            <Plus className="h-4 w-4" /> New
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <div className="w-full md:w-[500px] flex flex-col border-r bg-card z-10 shadow-xl transition-all duration-300">
          <ScrollArea className="flex-1 px-6 py-4">
            {!streamingText && !isLoading ? (
              <div className="h-full flex flex-col justify-center items-center text-center space-y-6 pt-20">
                <div className="relative">
                   <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full blur opacity-25 animate-pulse"></div>
                   <div className="relative bg-card p-6 rounded-full shadow-inner border">
                    <MapPin className="h-14 w-14 text-primary" />
                   </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">สัมผัสประสบการณ์เที่ยวแบบใหม่</h2>
                  <p className="text-muted-foreground px-12 text-sm leading-relaxed">
                    บอกจุดหมายที่คุณใฝ่ฝัน แล้วให้ AI ของเราเนรมิตทริปสุดครีเอทีฟพร้อมพิกัดลับสำหรับคุณ
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 px-8">
                   {["ลำพูน 3 วัน", "น่านหน้าหนาว 4 วัน", "เชียงรายสายคาเฟ่"].map(hint => (
                     <button key={hint} onClick={() => setInput(hint)} className="text-xs bg-muted hover:bg-primary/10 hover:text-primary transition-colors px-3 py-1.5 rounded-full border">
                       {hint}
                     </button>
                   ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {currentTrip && (
                  <div className="space-y-2 border-b pb-6">
                    <h2 className="text-4xl font-extrabold tracking-tight leading-tight">{currentTrip.title}</h2>
                    <div className="flex gap-4 text-sm font-medium text-muted-foreground">
                      <span className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-2 py-0.5 rounded-md">
                        <MapPin className="h-3.5 w-3.5" /> {currentTrip.destination}
                      </span>
                      <span className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 px-2 py-0.5 rounded-md">
                        <Calendar className="h-3.5 w-3.5" /> {currentTrip.duration}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed text-base">
                  <ReactMarkdown>{streamingText}</ReactMarkdown>
                  <div ref={scrollRef} />
                </div>

                {currentTrip && currentTrip.locations.length > 0 && (
                  <div className="space-y-6 border-t pt-8">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-primary" /> จุดเช็คอินที่น่าสนใจ
                    </h3>
                    <div className="grid gap-4">
                      {currentTrip.locations.map((loc, idx) => (
                        <Card key={idx} className="group overflow-hidden hover:shadow-md transition-all border-none bg-muted/30" 
                              onClick={() => setMapViewport({ center: [loc.lng, loc.lat], zoom: 16 })}>
                          <div className="flex">
                            {loc.imageUrl ? (
                              <img src={loc.imageUrl} alt={loc.name} className="w-24 h-24 object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                              <div className="w-24 h-24 bg-muted flex items-center justify-center">
                                <MapPin className="text-muted-foreground/30 h-8 w-8" />
                              </div>
                            )}
                            <CardContent className="p-4 flex-1">
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-lg group-hover:text-primary transition-colors">{idx + 1}. {loc.name}</span>
                                {loc.day && <span className="text-[10px] uppercase tracking-widest bg-primary text-primary-foreground font-bold px-2 py-0.5 rounded">Day {loc.day}</span>}
                              </div>
                              {loc.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{loc.description}</p>}
                            </CardContent>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="p-6 border-t bg-background/50 backdrop-blur-md">
            <div className="flex gap-2 bg-muted p-1.5 rounded-2xl border shadow-inner">
              <Input
                placeholder="ทริปในฝันของคุณเป็นอย่างไร..."
                className="border-none bg-transparent focus-visible:ring-0 shadow-none text-base h-11"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={isLoading}
              />
              <Button onClick={handleSend} disabled={isLoading} className="rounded-xl h-11 w-11 p-0 shrink-0 shadow-lg">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 relative">
          <Map
            viewport={mapViewport}
            onViewportChange={setMapViewport}
            className="w-full h-full grayscale-[0.2] contrast-[1.1]"
          >
            <MapControls showZoom showLocate showFullscreen position="bottom-right" />
            
            {currentTrip?.locations.map((loc, idx) => (
              <MapMarker key={idx} longitude={loc.lng} latitude={loc.lat}>
                <MarkerContent>
                  <div className="relative group">
                    <div className="absolute -inset-2 bg-primary rounded-full blur opacity-0 group-hover:opacity-40 transition-opacity"></div>
                    <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-2xl border-2 border-white relative z-10 transition-transform hover:scale-125">
                      {idx + 1}
                    </div>
                  </div>
                </MarkerContent>
                <MarkerPopup className="p-0 border-none shadow-2xl overflow-hidden rounded-2xl min-w-[240px]">
                  {loc.imageUrl && (
                    <img src={loc.imageUrl} alt={loc.name} className="w-full h-32 object-cover" />
                  )}
                  <div className="p-4 bg-card">
                    <h4 className="font-black text-lg leading-tight">{loc.name}</h4>
                    {loc.day && <p className="text-[10px] font-bold text-primary uppercase tracking-tighter mb-2">ตารางวันที่ {loc.day}</p>}
                    {loc.description && <p className="text-xs text-muted-foreground leading-snug">{loc.description}</p>}
                  </div>
                </MarkerPopup>
              </MapMarker>
            ))}

            {routeCoordinates.length > 1 && (
              <MapRoute 
                coordinates={routeCoordinates}
                color="hsl(var(--primary))"
                width={5}
                opacity={0.4}
              />
            )}
          </Map>

          {showHistory && (
            <div className="absolute inset-0 z-30 bg-background/40 backdrop-blur-md p-4 md:p-12 animate-in fade-in duration-300">
              <div className="max-w-3xl mx-auto bg-card border rounded-3xl shadow-2xl h-full flex flex-col overflow-hidden">
                <div className="p-6 border-b flex justify-between items-center bg-muted/30">
                  <h3 className="text-2xl font-black">การผจญภัยที่ผ่านมา</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)} className="rounded-full">ปิดหน้าต่าง</Button>
                </div>
                <ScrollArea className="flex-1 p-6">
                  {savedTrips.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
                      <ImageIcon className="h-12 w-12 opacity-20" />
                      <p>ยังไม่มีทริปที่บันทึกไว้</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {savedTrips.map((trip) => (
                        <Card key={trip._id} className="cursor-pointer hover:border-primary hover:shadow-lg transition-all overflow-hidden group" onClick={() => loadTrip(trip)}>
                          <CardHeader className="p-5">
                            <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">{trip.title}</CardTitle>
                            <div className="flex gap-3 text-xs font-semibold text-muted-foreground pt-2">
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {trip.destination}</span>
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {trip.duration}</span>
                            </div>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
