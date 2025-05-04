import React, { useRef, useState, useEffect } from 'react';
import { useWebRTC } from '@/contexts/WebRTCContext';
import { Button } from '@/components/ui/button';
import { 
  Square, Circle, Type, Pencil, Eraser, X, Download, 
  Trash2, MousePointer, Undo, Redo, Move, Image as ImageIcon 
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Point {
  x: number;
  y: number;
}

interface DrawElement {
  id: string;
  type: 'pencil' | 'line' | 'rectangle' | 'circle' | 'text' | 'eraser';
  points: Point[];
  color: string;
  width: number;
  text?: string;
  creator: string;
}

interface WhiteboardAction {
  type: 'add' | 'clear' | 'undo' | 'redo';
  element?: DrawElement;
  creator: string;
}

interface InteractiveWhiteboardProps {
  onClose: () => void;
}

const colors = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', 
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'
];

const brushSizes = [1, 2, 3, 5, 8, 12];

export default function InteractiveWhiteboard({ onClose }: InteractiveWhiteboardProps) {
  // Рефы для доступа к канвасу
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  
  // Получение контекста WebRTC
  const { sendWhiteboardAction, whiteboardActions = [] } = useWebRTC();
  
  // Состояния для инструментов рисования
  const [tool, setTool] = useState<'select' | 'pencil' | 'line' | 'rectangle' | 'circle' | 'text' | 'eraser' | 'move'>('pencil');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [elements, setElements] = useState<DrawElement[]>([]);
  const [history, setHistory] = useState<DrawElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [textPosition, setTextPosition] = useState<Point | null>(null);
  const [inputText, setInputText] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const [currentNote, setCurrentNote] = useState('');
  
  // Эффект для инициализации канваса
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    // Задаем размеры канваса равными размерам родительского контейнера
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        redrawCanvas();
      }
    };
    
    // Инициализация размеров при монтировании
    resizeCanvas();
    
    // Добавляем слушатель на изменение размера окна
    window.addEventListener('resize', resizeCanvas);
    
    // Очистка слушателя при размонтировании
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);
  
  // Эффект для обработки полученных действий с доской
  useEffect(() => {
    if (!whiteboardActions || whiteboardActions.length === 0) return;
    
    // Обрабатываем последнее действие
    const lastAction = whiteboardActions[whiteboardActions.length - 1];
    
    switch (lastAction.type) {
      case 'add':
        if (lastAction.element) {
          setElements(prev => [...prev, lastAction.element as DrawElement]);
          setHistory(prev => [...prev.slice(0, historyIndex + 1), [...elements, lastAction.element as DrawElement]]);
          setHistoryIndex(prev => prev + 1);
        }
        break;
      case 'clear':
        setElements([]);
        setHistory([]);
        setHistoryIndex(-1);
        break;
      case 'undo':
        if (historyIndex > 0) {
          setHistoryIndex(prev => prev - 1);
          setElements(history[historyIndex - 1] || []);
        }
        break;
      case 'redo':
        if (historyIndex < history.length - 1) {
          setHistoryIndex(prev => prev + 1);
          setElements(history[historyIndex + 1] || []);
        }
        break;
    }
    
    redrawCanvas();
  }, [whiteboardActions, elements, history, historyIndex]);
  
  // Функция для отрисовки канваса
  const redrawCanvas = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    // Очистка канваса
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Отрисовка элементов
    elements.forEach(element => {
      if (element.type === 'pencil' || element.type === 'eraser') {
        context.beginPath();
        context.moveTo(element.points[0].x, element.points[0].y);
        
        for (let i = 1; i < element.points.length; i++) {
          context.lineTo(element.points[i].x, element.points[i].y);
        }
        
        context.strokeStyle = element.type === 'eraser' ? '#FFFFFF' : element.color;
        context.lineWidth = element.width;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.stroke();
      } else if (element.type === 'line') {
        context.beginPath();
        context.moveTo(element.points[0].x, element.points[0].y);
        context.lineTo(element.points[1].x, element.points[1].y);
        context.strokeStyle = element.color;
        context.lineWidth = element.width;
        context.stroke();
      } else if (element.type === 'rectangle') {
        const width = element.points[1].x - element.points[0].x;
        const height = element.points[1].y - element.points[0].y;
        
        context.beginPath();
        context.rect(element.points[0].x, element.points[0].y, width, height);
        context.strokeStyle = element.color;
        context.lineWidth = element.width;
        context.stroke();
      } else if (element.type === 'circle') {
        const radius = Math.sqrt(
          Math.pow(element.points[1].x - element.points[0].x, 2) + 
          Math.pow(element.points[1].y - element.points[0].y, 2)
        );
        
        context.beginPath();
        context.arc(element.points[0].x, element.points[0].y, radius, 0, 2 * Math.PI);
        context.strokeStyle = element.color;
        context.lineWidth = element.width;
        context.stroke();
      } else if (element.type === 'text' && element.text) {
        context.font = `${Math.max(12, element.width * 5)}px Arial`;
        context.fillStyle = element.color;
        context.fillText(element.text, element.points[0].x, element.points[0].y);
      }
    });
  };
  
  // Обработчики событий для рисования
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Если выбран инструмент текст, показываем поле ввода
    if (tool === 'text') {
      setTextPosition({ x, y });
      if (textInputRef.current) {
        textInputRef.current.style.left = `${x}px`;
        textInputRef.current.style.top = `${y}px`;
        textInputRef.current.focus();
      }
      return;
    }
    
    setIsDrawing(true);
    setStartPoint({ x, y });
    
    if (tool === 'pencil' || tool === 'eraser') {
      const newElement: DrawElement = {
        id: Date.now().toString(),
        type: tool === 'eraser' ? 'eraser' : 'pencil',
        points: [{ x, y }],
        color: color,
        width: brushSize,
        creator: 'local'
      };
      
      setElements(prev => [...prev, newElement]);
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !isDrawing || !startPoint) return;
    
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Временная отрисовка для визуального отклика
    if (tool === 'pencil' || tool === 'eraser') {
      // Добавляем точку в последний элемент
      setElements(prev => {
        const lastElement = { ...prev[prev.length - 1] };
        lastElement.points = [...lastElement.points, { x, y }];
        return [...prev.slice(0, prev.length - 1), lastElement];
      });
      
      // Перерисовываем канвас
      redrawCanvas();
    } else {
      // Для остальных инструментов делаем временную отрисовку
      redrawCanvas();
      
      context.beginPath();
      
      if (tool === 'line') {
        context.moveTo(startPoint.x, startPoint.y);
        context.lineTo(x, y);
      } else if (tool === 'rectangle') {
        const width = x - startPoint.x;
        const height = y - startPoint.y;
        context.rect(startPoint.x, startPoint.y, width, height);
      } else if (tool === 'circle') {
        const radius = Math.sqrt(
          Math.pow(x - startPoint.x, 2) + 
          Math.pow(y - startPoint.y, 2)
        );
        context.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
      }
      
      context.strokeStyle = color;
      context.lineWidth = brushSize;
      context.stroke();
    }
  };
  
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !isDrawing || !startPoint) {
      setIsDrawing(false);
      return;
    }
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (tool === 'line' || tool === 'rectangle' || tool === 'circle') {
      const newElement: DrawElement = {
        id: Date.now().toString(),
        type: tool,
        points: [startPoint, { x, y }],
        color: color,
        width: brushSize,
        creator: 'local'
      };
      
      setElements(prev => [...prev, newElement]);
      
      // Отправляем действие на сервер
      if (sendWhiteboardAction) {
        sendWhiteboardAction({
          type: 'add',
          element: newElement,
          creator: 'local'
        });
      }
      
      // Обновляем историю
      const newHistory = [...elements, newElement] as DrawElement[];
      setHistory(prev => [...prev.slice(0, historyIndex + 1), newHistory]);
      setHistoryIndex(prev => prev + 1);
    } else if (tool === 'pencil' || tool === 'eraser') {
      // Действие уже добавлено в handleMouseMove
      const lastElement = elements[elements.length - 1];
      
      // Отправляем действие на сервер
      if (sendWhiteboardAction) {
        sendWhiteboardAction({
          type: 'add',
          element: lastElement,
          creator: 'local'
        });
      }
      
      // Обновляем историю
      const elementsHistory = [...elements] as DrawElement[];
      setHistory(prev => [...prev.slice(0, historyIndex + 1), elementsHistory]);
      setHistoryIndex(prev => prev + 1);
    }
    
    setIsDrawing(false);
    setStartPoint(null);
    redrawCanvas();
  };
  
  // Обработчик для ввода текста
  const handleTextInput = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!textPosition || !inputText) {
      setTextPosition(null);
      setInputText('');
      return;
    }
    
    const newElement: DrawElement = {
      id: Date.now().toString(),
      type: 'text',
      points: [textPosition],
      color: color,
      width: brushSize,
      text: inputText,
      creator: 'local'
    };
    
    setElements(prev => [...prev, newElement]);
    
    // Отправляем действие на сервер
    if (sendWhiteboardAction) {
      sendWhiteboardAction({
        type: 'add',
        element: newElement,
        creator: 'local'
      });
    }
    
    // Обновляем историю
    const newTextHistory = [...elements, newElement] as DrawElement[];
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newTextHistory]);
    setHistoryIndex(prev => prev + 1);
    
    setTextPosition(null);
    setInputText('');
    redrawCanvas();
  };
  
  // Функция для очистки доски
  const handleClear = () => {
    setElements([]);
    setHistory([]);
    setHistoryIndex(-1);
    
    if (sendWhiteboardAction) {
      sendWhiteboardAction({
        type: 'clear',
        creator: 'local'
      });
    }
    
    redrawCanvas();
  };
  
  // Функции для отмены и повтора действий
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setElements(history[historyIndex - 1] || []);
      
      if (sendWhiteboardAction) {
        sendWhiteboardAction({
          type: 'undo',
          creator: 'local'
        });
      }
      
      redrawCanvas();
    }
  };
  
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setElements(history[historyIndex + 1] || []);
      
      if (sendWhiteboardAction) {
        sendWhiteboardAction({
          type: 'redo',
          creator: 'local'
        });
      }
      
      redrawCanvas();
    }
  };
  
  // Функция для сохранения доски как изображения
  const handleSave = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    
    const link = document.createElement('a');
    link.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = dataUrl;
    link.click();
  };
  
  // Функция для добавления заметки
  const handleAddNote = () => {
    if (!currentNote.trim()) return;
    
    setNotes(prev => [...prev, currentNote]);
    setCurrentNote('');
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-hidden flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-[95vw] h-[90vh] flex flex-col p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Интерактивная доска</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex flex-1 gap-4 overflow-hidden">
          {/* Панель инструментов */}
          <div className="w-14 shrink-0 flex flex-col gap-2">
            <Button
              variant={tool === 'select' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setTool('select')}
              title="Выбрать"
            >
              <MousePointer className="h-5 w-5" />
            </Button>
            
            <Button
              variant={tool === 'pencil' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setTool('pencil')}
              title="Карандаш"
            >
              <Pencil className="h-5 w-5" />
            </Button>
            
            <Button
              variant={tool === 'line' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setTool('line')}
              title="Линия"
            >
              <div className="h-5 w-5 flex items-center justify-center">
                <div className="h-0.5 w-full bg-current" />
              </div>
            </Button>
            
            <Button
              variant={tool === 'rectangle' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setTool('rectangle')}
              title="Прямоугольник"
            >
              <Square className="h-5 w-5" />
            </Button>
            
            <Button
              variant={tool === 'circle' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setTool('circle')}
              title="Круг"
            >
              <Circle className="h-5 w-5" />
            </Button>
            
            <Button
              variant={tool === 'text' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setTool('text')}
              title="Текст"
            >
              <Type className="h-5 w-5" />
            </Button>
            
            <Button
              variant={tool === 'eraser' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setTool('eraser')}
              title="Ластик"
            >
              <Eraser className="h-5 w-5" />
            </Button>
            
            <div className="flex-1"></div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="relative"
                  title="Цвет"
                >
                  <div 
                    className="absolute inset-[25%] rounded-full" 
                    style={{ backgroundColor: color }}
                  ></div>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2">
                <div className="grid grid-cols-5 gap-2">
                  {colors.map(c => (
                    <button
                      key={c}
                      className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-blue-500' : 'border-gray-300'}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    ></button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  title="Размер кисти"
                >
                  <div className="flex items-center justify-center">
                    <div 
                      className="rounded-full bg-current" 
                      style={{ 
                        width: `${Math.min(18, brushSize * 3)}px`, 
                        height: `${Math.min(18, brushSize * 3)}px` 
                      }}
                    ></div>
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-4">
                <Slider 
                  min={1} 
                  max={12} 
                  step={1} 
                  value={[brushSize]} 
                  onValueChange={values => setBrushSize(values[0])}
                />
                <div className="flex justify-between mt-2">
                  {brushSizes.map(size => (
                    <button
                      key={size}
                      className={`rounded-full border ${brushSize === size ? 'border-blue-500' : 'border-gray-300'}`}
                      style={{ 
                        width: `${Math.min(24, size * 3)}px`, 
                        height: `${Math.min(24, size * 3)}px` 
                      }}
                      onClick={() => setBrushSize(size)}
                    ></button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleClear}
              title="Очистить доску"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Отменить"
            >
              <Undo className="h-5 w-5" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Повторить"
            >
              <Redo className="h-5 w-5" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleSave}
              title="Сохранить как изображение"
            >
              <Download className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Основная область рисования */}
          <div className="flex-1 flex flex-col">
            <Tabs defaultValue="board">
              <TabsList className="mb-2">
                <TabsTrigger value="board">Доска</TabsTrigger>
                <TabsTrigger value="notes">Заметки</TabsTrigger>
              </TabsList>
              
              <TabsContent value="board" className="flex-1 relative bg-white border rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 bg-white"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                ></canvas>
                
                {textPosition && (
                  <form 
                    onSubmit={handleTextInput}
                    className="absolute z-10"
                    style={{ 
                      left: textPosition.x, 
                      top: textPosition.y,
                      transform: 'translate(-50%, -100%)'
                    }}
                  >
                    <Input
                      ref={textInputRef}
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="bg-white/80 backdrop-blur-sm"
                      placeholder="Введите текст"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-1">
                      <Button type="submit" size="sm">Добавить</Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setTextPosition(null);
                          setInputText('');
                        }}
                      >
                        Отмена
                      </Button>
                    </div>
                  </form>
                )}
              </TabsContent>
              
              <TabsContent value="notes" className="h-full">
                <div className="h-full flex flex-col">
                  <ScrollArea className="flex-1 border rounded-lg p-4 mb-4">
                    {notes.length === 0 ? (
                      <div className="flex items-center justify-center h-32 text-gray-400">
                        Нет заметок. Добавьте первую заметку ниже.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {notes.map((note, index) => (
                          <Card key={index}>
                            <CardContent className="p-4">
                              <p className="whitespace-pre-wrap">{note}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  
                  <div className="flex gap-2">
                    <Input
                      value={currentNote}
                      onChange={(e) => setCurrentNote(e.target.value)}
                      placeholder="Введите заметку..."
                      className="flex-1"
                    />
                    <Button onClick={handleAddNote}>Добавить</Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}