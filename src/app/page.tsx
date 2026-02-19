"use client";

import { useState, useEffect, useRef } from "react";
import { Map, MapMarker, MarkerContent, MarkerPopup, MapControls, MapRoute } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Loader2, Send, MapPin, Calendar, Save, History, Plus, 
  ExternalLink, Coffee, Utensils, TreePine, Building2, 
  Tent, Store, Landmark, Hotel, Church, Trash2, Search 
} from "lucide-react";
import ReactMarkdown from 'react-markdown';

interface Location {
  name: string;
  lat: number;
  lng: number;
  day?: number;
  description?: string;
  type: string;
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
    center: [100.5231, 13.7367] as [number, number],
    zoom: 5,
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSavedTrips();
  }, []);

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

  const deleteTrip = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบแผนการเที่ยวนี้?")) return;
    
    try {
      const res = await fetch(`/api/trips/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchSavedTrips();
        if (currentTrip?._id === id) {
          setCurrentTrip(null);
          setStreamingText("");
        }
      }
    } catch (error) {
      alert("ลบทริปไม่สำเร็จ");
    }
  };

  const getIcon = (type: string) => {
    const t = type?.toLowerCase();
    if (t === "คาเฟ่" || t === "cafe") return <Coffee className="h-5 w-5" />;
    if (t === "ร้านอาหาร" || t === "restaurant") return <Utensils className="h-5 w-5" />;
    if (t === "สวนสาธารณะ" || t === "park") return <TreePine className="h-5 w-5" />;
    if (t === "ธรรมชาติ" || t === "nature") return <Tent className="h-5 w-5" />;
    if (t === "ห้างสรรพสินค้า" || t === "mall") return <Store className="h-5 w-5" />;
    if (t === "สถานที่สำคัญ" || t === "landmark") return <Landmark className="h-5 w-5" />;
    if (t === "โรงแรม" || t === "hotel") return <Hotel className="h-5 w-5" />;
    if (t === "วัด" || t === "temple") return <Church className="h-5 w-5" />;
    return <MapPin className="h-5 w-5" />;
  };

  const generateGoogleMapsLink = (name: string, destination: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + " " + destination)}`;
  };

  const generateGoogleSearchLink = (name: string, destination: string) => {
    return `https://www.google.com/search?q=${encodeURIComponent(name + " " + destination)}`;
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
        
        const parts = fullText.split("---JSON_DATA---");
        setStreamingText(parts[0]);
      }

      const finalParts = fullText.split("---JSON_DATA---");
      if (finalParts.length > 1) {
        try {
          let jsonString = finalParts[1].trim();
          // ลบ ```json และ ``` ออกถ้า AI แถมมา
          jsonString = jsonString.replace(/```json/g, "").replace(/```/g, "").trim();
          
          const jsonData = JSON.parse(jsonString);
          const completedTrip = {
            ...jsonData,
            plan: finalParts[0]
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
        alert("บันทึกแผนการเที่ยวเรียบร้อยแล้ว!");
        fetchSavedTrips();
      }
    } catch (error) {
      alert("บันทึกไม่สำเร็จ");
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
        zoom: 12,
      });
    }
    setShowHistory(false);
  };

  const routeCoordinates = currentTrip?.locations?.map(loc => [loc.lng, loc.lat] as [number, number]) || [];

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans">
      <header className="border-b p-4 flex justify-between items-center bg-card shadow-sm z-20">
        <h1 className="text-2xl font-black flex items-center gap-2 tracking-tight text-primary">
          <div className="bg-primary p-1.5 rounded-lg shadow-lg">
            <MapPin className="text-primary-foreground h-6 w-6" />
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">Travel AI Muse</span>
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)} className="rounded-full font-bold">
            <History className="mr-2 h-4 w-4" /> ประวัติการเที่ยว
          </Button>
          {currentTrip && !currentTrip._id && (
            <Button size="sm" onClick={saveTrip} disabled={isLoading} className="rounded-full font-bold bg-gradient-to-r from-blue-600 to-primary shadow-md">
              <Save className="mr-2 h-4 w-4" /> บันทึกแผน
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => {setCurrentTrip(null); setStreamingText(""); setInput("");}} className="rounded-full font-bold">
            <Plus className="h-4 w-4" /> สร้างใหม่
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <div className="w-full md:w-[500px] flex flex-col border-r bg-card z-10 shadow-2xl">
          <ScrollArea className="flex-1 px-8 py-6">
            {!streamingText && !isLoading ? (
              <div className="h-full flex flex-col justify-center items-center text-center space-y-8 pt-20">
                <div className="relative">
                   <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl animate-pulse"></div>
                   <div className="relative bg-gradient-to-br from-primary to-blue-600 p-8 rounded-full shadow-2xl border-4 border-white">
                    <MapPin className="h-16 w-16 text-white" />
                   </div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-black tracking-tight">พร้อมออกเดินทางหรือยัง?</h2>
                  <p className="text-muted-foreground px-12 text-base leading-relaxed">
                    บอกที่ที่คุณอยากไป แล้วปล่อยให้ AI สร้างทริปในฝันที่มาพร้อมพิกัดนำทางบน Google Maps ที่แม่นยำ
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3 px-8">
                   {["ลำพูน 3 วัน", "น่านหน้าหนาว", "ภูเก็ต 4 วัน"].map(hint => (
                     <button key={hint} onClick={() => setInput(hint)} className="text-sm bg-muted hover:bg-primary hover:text-white transition-all duration-300 px-5 py-2 rounded-full border font-bold">
                       {hint}
                     </button>
                   ))}
                </div>
              </div>
            ) : (
              <div className="space-y-10 pb-20 animate-in fade-in duration-700">
                {currentTrip && (
                  <div className="space-y-4 border-b pb-8">
                    <h2 className="text-4xl font-black tracking-tighter leading-none text-primary">{currentTrip.title}</h2>
                    <div className="flex flex-wrap gap-3">
                      <span className="flex items-center gap-2 bg-muted text-foreground font-bold px-3 py-1 rounded-full text-sm">
                        <MapPin className="h-4 w-4 text-primary" /> {currentTrip.destination}
                      </span>
                      <span className="flex items-center gap-2 bg-muted text-foreground font-bold px-3 py-1 rounded-full text-sm">
                        <Calendar className="h-4 w-4 text-primary" /> {currentTrip.duration}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed text-lg font-medium">
                  <ReactMarkdown>{streamingText}</ReactMarkdown>
                  <div ref={scrollRef} />
                </div>

                {currentTrip && currentTrip.locations.length > 0 && (
                  <div className="space-y-6 border-t pt-10">
                    <h3 className="text-2xl font-black flex items-center gap-3">
                      <Landmark className="h-6 w-6 text-primary" /> จุดเช็คอินที่แนะนำ
                    </h3>
                    <div className="grid gap-4">
                      {currentTrip.locations.map((loc, idx) => (
                        <Card key={idx} className="group overflow-hidden hover:shadow-xl transition-all border-2 border-muted bg-card hover:border-primary/30" 
                              onClick={() => setMapViewport({ center: [loc.lng, loc.lat], zoom: 16 })}>
                          <CardContent className="p-5">
                            <div className="flex gap-4 items-start">
                              <div className="bg-primary/10 text-primary p-3 rounded-2xl group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                {getIcon(loc.type)}
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="font-black text-xl leading-tight">{idx + 1}. {loc.name}</span>
                                  {loc.day && <span className="text-[10px] font-black uppercase tracking-widest bg-primary/20 text-primary px-2 py-1 rounded-md">วันที่ {loc.day}</span>}
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-primary mb-1">
                                    <span className="bg-primary/10 px-2 py-0.5 rounded-md italic">{loc.type}</span>
                                </div>
                                {loc.description && <p className="text-sm text-muted-foreground font-medium leading-snug">{loc.description}</p>}
                                <div className="flex gap-4 pt-2">
                                  <a 
                                    href={generateGoogleMapsLink(loc.name, currentTrip.destination)} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Google Maps <ExternalLink className="h-3 w-3" />
                                  </a>
                                  <a 
                                    href={generateGoogleSearchLink(loc.name, currentTrip.destination)} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary hover:underline transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    ค้นหาข้อมูล <Search className="h-3 w-3" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="p-6 border-t bg-background/80 backdrop-blur-xl">
            <div className="flex gap-3 bg-muted p-2 rounded-2xl border shadow-inner">
              <Input
                placeholder="ทริปของคุณเป็นแบบไหน..."
                className="border-none bg-transparent focus-visible:ring-0 shadow-none text-lg font-medium h-12"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={isLoading}
              />
              <Button onClick={handleSend} disabled={isLoading} className="rounded-xl h-12 px-6 shadow-xl font-bold bg-primary hover:scale-105 transition-transform">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "ส่งข้อมูล"}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 relative">
          <Map
            viewport={mapViewport}
            onViewportChange={setMapViewport}
            className="w-full h-full grayscale-[0.1] contrast-[1.05]"
          >
            <MapControls showZoom showLocate showFullscreen position="bottom-right" />
            
            {currentTrip?.locations.map((loc, idx) => (
              <MapMarker key={idx} longitude={loc.lng} latitude={loc.lat}>
                <MarkerContent>
                  <div className="relative group cursor-pointer">
                    <div className="absolute -inset-4 bg-primary/30 rounded-full blur opacity-0 group-hover:opacity-100 transition-all duration-300 scale-50 group-hover:scale-100"></div>
                    <div className="bg-primary text-primary-foreground w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-2xl border-4 border-white relative z-10 transition-all group-hover:rounded-full group-hover:rotate-[360deg]">
                      {idx + 1}
                    </div>
                  </div>
                </MarkerContent>
                <MarkerPopup className="p-0 border-none shadow-2xl overflow-hidden rounded-3xl min-w-[300px]">
                  <div className="p-6 bg-card space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/20 p-2.5 rounded-xl text-primary">
                        {getIcon(loc.type)}
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="font-black text-xl leading-none">{loc.name}</h4>
                        <span className="text-[10px] font-bold text-primary uppercase">{loc.type}</span>
                      </div>
                    </div>
                    {loc.description && <p className="text-sm text-muted-foreground font-medium">{loc.description}</p>}
                    <div className="pt-2 flex gap-2">
                      <Button asChild size="sm" className="w-full rounded-xl font-bold">
                        <a 
                          href={generateGoogleMapsLink(loc.name, currentTrip.destination)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          Google Maps <ExternalLink className="ml-2 h-3.5 w-3.5" />
                        </a>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="w-full rounded-xl font-bold">
                        <a 
                          href={generateGoogleSearchLink(loc.name, currentTrip.destination)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          ค้นหาข้อมูล <Search className="ml-2 h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </MarkerPopup>
              </MapMarker>
            ))}

            {routeCoordinates.length > 1 && (
              <MapRoute 
                coordinates={routeCoordinates}
                color="#3b82f6"
                width={6}
                opacity={0.3}
              />
            )}
          </Map>

          {showHistory && (
            <div className="absolute inset-0 z-30 bg-background/60 backdrop-blur-2xl p-6 md:p-16 animate-in zoom-in-95 duration-500">
              <div className="max-w-4xl mx-auto bg-card border-4 border-muted rounded-[2rem] shadow-2xl h-full flex flex-col overflow-hidden">
                <div className="p-8 border-b flex justify-between items-center bg-muted/20">
                  <h3 className="text-3xl font-black tracking-tighter text-primary">ประวัติการเดินทางของคุณ</h3>
                  <Button variant="outline" size="sm" onClick={() => setShowHistory(false)} className="rounded-full font-bold px-6">ปิด</Button>
                </div>
                <ScrollArea className="flex-1 p-8">
                  {savedTrips.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-20 text-muted-foreground space-y-6">
                      <div className="bg-muted p-6 rounded-full">
                        <History className="h-16 w-16 opacity-20" />
                      </div>
                      <p className="text-xl font-bold">ยังไม่มีทริปที่บันทึกไว้</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-6">
                      {savedTrips.map((trip) => (
                        <Card key={trip._id} className="cursor-pointer hover:border-primary hover:shadow-2xl transition-all duration-300 border-2 overflow-hidden group rounded-2xl relative" onClick={() => loadTrip(trip)}>
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity rounded-full h-8 w-8"
                            onClick={(e) => deleteTrip(e, trip._id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <CardHeader className="p-6">
                            <CardTitle className="text-2xl font-black group-hover:text-primary transition-colors pr-8 leading-tight">{trip.title}</CardTitle>
                            <div className="flex gap-4 text-sm font-bold text-muted-foreground pt-4">
                              <span className="flex items-center gap-1.5 text-primary"> <MapPin className="h-4 w-4" /> {trip.destination}</span>
                              <span className="flex items-center gap-1.5"> <Calendar className="h-4 w-4" /> {trip.duration}</span>
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
