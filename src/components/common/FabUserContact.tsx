import { User, Filter, ListChecks, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';

export default function FabUserContact() {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="rounded-full shadow-lg"
            size="lg"
          >
            <User className="w-5 h-5 mr-2" />
            User & Contact
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[220px]">
          <DropdownMenuItem onClick={() => navigate('/user')}>
            <User className="w-4 h-4 mr-2" />
            Open Tools
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/user?tab=advanced')}>
            <Filter className="w-4 h-4 mr-2" />
            Advanced Search
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/user?tab=audit')}>
            <ListChecks className="w-4 h-4 mr-2" />
            Audit Log
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/user?tab=docs')}>
            <BookOpen className="w-4 h-4 mr-2" />
            API Docs
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

