import * as React from "react";

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({
  value,
  onValueChange,
  children,
  className,
  ...props
}: TabsProps) {
  return (
    <TabsProvider value={value} onValueChange={onValueChange}>
      <div className={`tabs ${className || ""}`} {...props}>
        {children}
      </div>
    </TabsProvider>
  );
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

export function TabsList({ className, ...props }: TabsListProps) {
  return (
    <div
      className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${
        className || ""
      }`}
      {...props}
    />
  );
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({
  value,
  className,
  ...props
}: TabsTriggerProps) {
  const context = React.useContext(TabsContext);

  if (!context) {
    throw new Error("TabsTrigger must be used within a Tabs");
  }

  const { selectedValue, onValueChange } = context;

  const isSelected = selectedValue === value;

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isSelected
          ? "bg-background text-foreground shadow-sm"
          : "hover:bg-background/50 hover:text-foreground"
      } ${className || ""}`}
      onClick={() => onValueChange?.(value)}
      {...props}
    />
  );
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  selected?: boolean;
}

export function TabsContent({
  value,
  selected,
  className,
  ...props
}: TabsContentProps) {
  const context = React.useContext(TabsContext);
  
  if (!context) {
    throw new Error("TabsContent must be used within a Tabs");
  }
  
  const isSelected = selected !== undefined ? selected : context.selectedValue === value;
  
  if (!isSelected) {
    return null;
  }

  return <div className={className} {...props} />;
}

// Создаем контекст для передачи текущего значения Tabs вниз
interface TabsContextValue {
  selectedValue: string;
  onValueChange?: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

export function TabsProvider({
  children,
  value,
  onValueChange,
}: {
  children: React.ReactNode;
  value: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <TabsContext.Provider value={{ selectedValue: value, onValueChange }}>
      {children}
    </TabsContext.Provider>
  );
}