export interface Service {
  id: number;
  name: string;
  description: string;
  price: string;
  time: string;
  status: 'active' | 'inactive';
}

const STORAGE_KEY = 'fluxoamigo_services';

const defaultServices: Service[] = [
  { id: 1, name: 'Lavagem Simples', description: 'Ducha, shampoo, aspiração e pretinho.', price: 'R$ 50,00', time: '30 min', status: 'active' },
  { id: 2, name: 'Lavagem Completa', description: 'Lavagem simples + cera líquida e limpeza de painel.', price: 'R$ 80,00', time: '45 min', status: 'active' },
  { id: 3, name: 'Lavagem Completa + Cera', description: 'Lavagem completa com aplicação de cera em pasta.', price: 'R$ 120,00', time: '1 hora', status: 'active' },
  { id: 4, name: 'Higienização Interna', description: 'Limpeza profunda de bancos, teto e carpetes.', price: 'R$ 150,00', time: '2 horas', status: 'active' },
  { id: 5, name: 'Polimento', description: 'Polimento comercial para remoção de riscos superficiais.', price: 'R$ 250,00', time: '3 horas', status: 'inactive' },
];

export function getServices(): Service[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultServices));
    return defaultServices;
  }
  return JSON.parse(stored);
}

export function saveServices(services: Service[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
}

export function addService(data: Omit<Service, 'id'>): Service {
  const services = getServices();
  const maxId = services.length > 0 ? Math.max(...services.map(s => s.id)) : 0;
  const newService: Service = { ...data, id: maxId + 1 };
  services.push(newService);
  saveServices(services);
  return newService;
}

export function updateService(id: number, data: Partial<Omit<Service, 'id'>>): Service | null {
  const services = getServices();
  const index = services.findIndex(s => s.id === id);
  if (index === -1) return null;
  services[index] = { ...services[index], ...data };
  saveServices(services);
  return services[index];
}

export function deleteService(id: number): boolean {
  const services = getServices();
  const filtered = services.filter(s => s.id !== id);
  if (filtered.length === services.length) return false;
  saveServices(filtered);
  return true;
}

export function getServiceById(id: number): Service | undefined {
  return getServices().find(s => s.id === id);
}
