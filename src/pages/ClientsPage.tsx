import { EditClientDialog } from '@/components/clients/EditClientDialog';
import { MainLayout } from '@/components/layout/MainLayout';
import { CreateClientDialog } from '@/components/loads/CreateClientDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Client } from '@/hooks/useClients';
import { useClients, useDeleteClient } from '@/hooks/useClients';
import { useLoads } from '@/hooks/useLoads';
import { useToast } from '@/hooks/use-toast';
import * as timeWindowLib from '@/lib/timeWindow'; // Use the shared utility
import { safeFormatDate } from '@/lib/utils';
import { parseISO } from 'date-fns';
import {
  Building2,
  Eye,
  Link2,
  Loader2,
  Mail,
  MoreHorizontal,
  Package,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

// Parse time_window to get customer ID with proper type handling using shared utility
function getCustomerIdFromLoad(timeWindow: unknown): string | null {
  const tw = timeWindowLib.parseTimeWindowOrNull(timeWindow);
  
  // Use type assertion to access thirdParty data since TimeWindowDataFull includes it
  const data = tw as { thirdParty?: { customerId?: string | number | null } } | null;
  const customerId = data?.thirdParty?.customerId;
  
  if (customerId === null || customerId === undefined) {
    return null;
  }
  
  // Convert numbers to strings
  return String(customerId);
}

export default function ClientsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: loads = [] } = useLoads();
  const deleteClient = useDeleteClient();
  const { toast } = useToast();

  // Filter for third-party loads
  const thirdPartyLoads = useMemo(() => 
    loads.filter(load => load.load_id.startsWith('TP-')), 
    [loads]
  );

  // Get loads count by customer with proper type safety
  const getLoadsForCustomer = (clientId: string) => {
    return thirdPartyLoads.filter(load => {
      const customerId = getCustomerIdFromLoad(load.time_window);
      // Type-safe comparison: only compare if customerId is not null
      return customerId !== null && customerId === clientId;
    });
  };

  // Check if customer has active loads this month
  const hasActiveLoadsThisMonth = (clientId: string) => {
    const customerLoads = getLoadsForCustomer(clientId);
    const now = new Date();
    return customerLoads.some(load => {
      try {
        const loadDate = parseISO(load.loading_date);
        return loadDate.getMonth() === now.getMonth() && 
               loadDate.getFullYear() === now.getFullYear();
      } catch {
        return false;
      }
    });
  };

  // Filter clients by search
  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients;
    const query = searchQuery.toLowerCase();
    return clients.filter(client => 
      client.name.toLowerCase().includes(query) ||
      client.contact_person?.toLowerCase().includes(query) ||
      client.contact_email?.toLowerCase().includes(query) ||
      client.contact_phone?.includes(query)
    );
  }, [clients, searchQuery]);

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setEditDialogOpen(true);
  };

  const handleDelete = (client: Client) => {
    setSelectedClient(client);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedClient) return;
    
    deleteClient.mutate(selectedClient.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setSelectedClient(null);
        toast({
          title: 'Customer deleted',
          description: 'The customer has been successfully deleted.',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to delete customer. Please try again.',
          variant: 'destructive',
        });
      },
    });
  };

  const copyPortalLink = (clientId: string, clientName: string) => {
    const portalUrl = `${window.location.origin}/portal/${clientId}`;
    navigator.clipboard.writeText(portalUrl).then(() => {
      toast({
        title: 'Portal link copied!',
        description: `Share this link with ${clientName} to give them access to their portal.`,
      });
    }).catch(() => {
      toast({
        title: 'Failed to copy',
        description: 'Please try again or copy manually.',
        variant: 'destructive',
      });
    });
  };

  return (
    <MainLayout title="Customers">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-6 w-6 text-purple-500" />
              Third-Party Customers
            </h1>
            <p className="text-muted-foreground">
              Manage your external customers for third-party loads
            </p>
          </div>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clients.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Third-Party Loads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{thirdPartyLoads.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {clients.filter(c => hasActiveLoadsThisMonth(c.id)).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customers Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Customers
                </CardTitle>
                <CardDescription>
                  View and manage your third-party customers
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {clientsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                {searchQuery ? (
                  <>
                    <p className="font-medium">No customers found</p>
                    <p className="text-sm">Try adjusting your search query</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">No customers yet</p>
                    <p className="text-sm">Add your first third-party customer to get started</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setCreateDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Customer
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Contact Details</TableHead>
                    <TableHead>Loads</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => {
                    const customerLoads = getLoadsForCustomer(client.id);
                    return (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                              <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                              <div className="font-medium">{client.name}</div>
                              {client.notes && (
                                <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {client.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {client.contact_person ? (
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{client.contact_person}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {client.contact_phone && (
                              <div className="flex items-center gap-1.5 text-sm">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{client.contact_phone}</span>
                              </div>
                            )}
                            {client.contact_email && (
                              <div className="flex items-center gap-1.5 text-sm">
                                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="truncate max-w-[180px]">{client.contact_email}</span>
                              </div>
                            )}
                            {!client.contact_phone && !client.contact_email && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="gap-1">
                            <Package className="h-3 w-3" />
                            {customerLoads.length} loads
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {safeFormatDate(client.created_at, 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/customers/${client.id}`} className="flex items-center">
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Dashboard
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => copyPortalLink(client.id, client.name)}>
                                <Link2 className="h-4 w-4 mr-2" />
                                Copy Portal Link
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEdit(client)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit Customer
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDelete(client)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Customer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Customer Dialog */}
      <CreateClientDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Edit Customer Dialog */}
      <EditClientDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        client={selectedClient}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium">{selectedClient?.name}</span>?
              This customer will be removed from the system. Existing loads will retain their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteClient.isPending}
            >
              {deleteClient.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Customer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}