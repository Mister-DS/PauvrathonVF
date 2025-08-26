import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Streamer } from '@/types';
import { Clock, Dice1, Trophy } from 'lucide-react';

interface TimeRewardModalProps {
  streamer: Streamer;
  onConfirm: (timeToAdd: number) => void;
  onCancel: () => void;
}

export function TimeRewardModal({ streamer, onConfirm, onCancel }: TimeRewardModalProps) {
  const [selectedMode, setSelectedMode] = useState<'fixed' | 'random'>(streamer.time_mode);
  const [customTime, setCustomTime] = useState(streamer.time_increment);
  const [maxRandomTime, setMaxRandomTime] = useState(streamer.max_random_time);

  const handleConfirm = () => {
    if (selectedMode === 'fixed') {
      onConfirm(customTime);
    } else {
      // Generate random time between 1 and maxRandomTime
      const randomTime = Math.floor(Math.random() * maxRandomTime) + 1;
      onConfirm(randomTime);
    }
  };

  const previewRandomTime = () => {
    if (selectedMode === 'random' && maxRandomTime > 0) {
      return `Entre 1 et ${maxRandomTime} secondes`;
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
            <Trophy className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>🎉 Victoire !</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choisissez le temps à ajouter au subathon
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <RadioGroup
            value={selectedMode}
            onValueChange={(value) => setSelectedMode(value as 'fixed' | 'random')}
          >
            <div className="flex items-center space-x-2 p-3 rounded-lg border">
              <RadioGroupItem value="fixed" id="fixed" />
              <Label htmlFor="fixed" className="flex-1 cursor-pointer">
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  Temps fixe
                </div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2 p-3 rounded-lg border">
              <RadioGroupItem value="random" id="random" />
              <Label htmlFor="random" className="flex-1 cursor-pointer">
                <div className="flex items-center">
                  <Dice1 className="mr-2 h-4 w-4" />
                  Temps aléatoire
                </div>
              </Label>
            </div>
          </RadioGroup>

          {selectedMode === 'fixed' && (
            <div className="space-y-2">
              <Label htmlFor="custom-time">Temps à ajouter (secondes)</Label>
              <Input
                id="custom-time"
                type="number"
                min="1"
                max="3600"
                value={customTime}
                onChange={(e) => setCustomTime(parseInt(e.target.value) || 1)}
              />
              <Badge variant="secondary" className="w-fit">
                {customTime} seconde{customTime > 1 ? 's' : ''}
              </Badge>
            </div>
          )}

          {selectedMode === 'random' && (
            <div className="space-y-2">
              <Label htmlFor="max-random">Temps maximum (secondes)</Label>
              <Input
                id="max-random"
                type="number"
                min="1"
                max="3600"
                value={maxRandomTime}
                onChange={(e) => setMaxRandomTime(parseInt(e.target.value) || 1)}
              />
              <Badge variant="secondary" className="w-fit">
                {previewRandomTime()}
              </Badge>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Annuler
            </Button>
            <Button onClick={handleConfirm} className="flex-1">
              Confirmer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}