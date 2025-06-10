import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ViperStrategy } from "@/components/viper-strategy";
import { 
  Zap, 
  BarChart3,
  Settings,
  Home
} from "lucide-react";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Mobile-first tabbed interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Tab Content */}
        <div className="flex-1 overflow-auto pb-20">
          <TabsContent value="dashboard" className="mt-0 p-4">
            <div className="space-y-6">
              <div className="text-center py-12">
                <Home className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">
                  VIPER Trading Platform
                </h1>
                <p className="text-gray-400 max-w-md mx-auto">
                  Navigate to the VIPER Strategy tab to access the complete trading interface with live/demo modes, 
                  market data, and autonomous trading controls.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="viper" className="mt-0 p-4">
            <ViperStrategy userId={1} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-0 p-4">
            <div className="text-center py-12">
              <BarChart3 className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Analytics</h2>
              <p className="text-gray-400">Advanced trading analytics coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-0 p-4">
            <div className="text-center py-12">
              <Settings className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Settings</h2>
              <p className="text-gray-400">Platform configuration options coming soon</p>
            </div>
          </TabsContent>
        </div>

        {/* Bottom Navigation */}
        <TabsList className="fixed bottom-0 left-0 right-0 h-16 bg-gray-800 border-t border-gray-700 rounded-none">
          <TabsTrigger 
            value="dashboard" 
            className="flex-1 flex flex-col items-center space-y-1 data-[state=active]:bg-gray-700"
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="viper" 
            className="flex-1 flex flex-col items-center space-y-1 data-[state=active]:bg-gray-700"
          >
            <Zap className="h-5 w-5" />
            <span className="text-xs">VIPER</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="analytics" 
            className="flex-1 flex flex-col items-center space-y-1 data-[state=active]:bg-gray-700"
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs">Analytics</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="settings" 
            className="flex-1 flex flex-col items-center space-y-1 data-[state=active]:bg-gray-700"
          >
            <Settings className="h-5 w-5" />
            <span className="text-xs">Settings</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}