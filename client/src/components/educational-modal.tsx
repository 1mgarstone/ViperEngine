import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TriangleAlert, GraduationCapIcon } from "lucide-react";

interface EducationalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EducationalModal({ isOpen, onClose }: EducationalModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="trading-bg-slate border-gray-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-trading-yellow">
            <GraduationCapIcon className="w-6 h-6" />
            <span>Welcome to TradingLab - Educational Platform</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">What is Paper Trading?</h3>
            <p className="text-gray-300">
              Paper trading is a simulated trading process where you can practice buying and selling 
              cryptocurrencies without risking real money. It's an excellent way to learn trading 
              strategies, test different approaches, and build confidence before real trading.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Key Benefits</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              <li>Learn trading strategies without financial risk</li>
              <li>Test different approaches and timeframes</li>
              <li>Build confidence and discipline</li>
              <li>Practice risk management techniques</li>
              <li>Understand market dynamics and psychology</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Platform Features</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              <li>Real-time market data simulation</li>
              <li>Complete order management system</li>
              <li>Portfolio tracking and analytics</li>
              <li>Risk management tools</li>
              <li>Educational resources and tutorials</li>
            </ul>
          </div>
          
          <Alert className="border-trading-red bg-red-900/20">
            <TriangleAlert className="h-4 w-4 text-trading-red" />
            <AlertDescription className="text-trading-red">
              <strong>Important Disclaimers:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>This platform uses simulated data and virtual funds only</li>
                <li>No real money or cryptocurrencies are involved</li>
                <li>Results may not reflect real market conditions</li>
                <li>Real trading involves substantial risk of loss</li>
                <li>Always conduct your own research before real trading</li>
                <li>Consider your risk tolerance and financial situation</li>
                <li>Never trade with money you cannot afford to lose</li>
              </ul>
            </AlertDescription>
          </Alert>
          
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-blue-400 mb-2">Getting Started</h4>
            <ol className="list-decimal list-inside space-y-1 text-blue-300 text-sm">
              <li>Explore the market data and select an asset</li>
              <li>Practice placing different types of orders</li>
              <li>Monitor your portfolio performance</li>
              <li>Experiment with risk management settings</li>
              <li>Learn from both profits and losses</li>
              <li>Keep a trading journal to track your progress</li>
            </ol>
          </div>
          
          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={onClose} className="border-gray-600 text-gray-300 hover:bg-gray-700">
              Learn More Later
            </Button>
            <Button onClick={onClose} className="bg-trading-blue hover:bg-blue-600">
              Start Paper Trading
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
