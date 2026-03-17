import { ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Section = 'do' | 'backlog' | 'skip';

interface MoveMenuProps {
  currentSection: Section;
  onMove: (target: Section) => void;
  children: React.ReactNode;
}

const SECTION_LABELS: Record<Section, string> = {
  do: 'Do',
  backlog: 'Maybe',
  skip: 'Skip',
};

const SECTION_ICONS: Record<Section, React.ReactNode> = {
  do: <ArrowUp className="h-3.5 w-3.5" />,
  backlog: <ArrowRight className="h-3.5 w-3.5" />,
  skip: <ArrowDown className="h-3.5 w-3.5" />,
};

export function MoveMenu({ currentSection, onMove, children }: MoveMenuProps) {
  const targets = (['do', 'backlog', 'skip'] as Section[]).filter(s => s !== currentSection);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {targets.map(target => (
          <DropdownMenuItem
            key={target}
            onSelect={() => onMove(target)}
            className="gap-2 text-[13px]"
          >
            {SECTION_ICONS[target]}
            Move to {SECTION_LABELS[target]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
