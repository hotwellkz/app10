import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Users, Building2, Mail, Phone, Search } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, getDocs, where } from 'firebase/firestore';
import { db, deleteCategory } from '../lib/firebase';
import { Employee } from '../types/employee';
import { TransactionHistory } from '../components/transactions/TransactionHistory';
import { CategoryCardType } from '../types';
import { EmployeeContextMenu } from '../components/employees/EmployeeContextMenu';
import { EmployeeForm } from './EmployeeForm';

export const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryCardType | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showEditForm, setShowEditForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'employees'), orderBy('lastName'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const employeesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Employee[];
      
      setEmployees(employeesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (employee: Employee) => {
    if (window.confirm(`Вы уверены, что хотите удалить сотрудника ${employee.lastName} ${employee.firstName}?`)) {
      try {
        await deleteDoc(doc(db, 'employees', employee.id));

        const q = query(
          collection(db, 'categories'),
          where('title', '==', `${employee.lastName} ${employee.firstName}`),
          where('row', '==', 2)
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const categoryDoc = snapshot.docs[0];
          await deleteCategory(categoryDoc.id, `${employee.lastName} ${employee.firstName}`, false);
        }
      } catch (error) {
        console.error('Error deleting employee:', error);
        alert('Ошибка при удалении сотрудника');
      }
    }
  };

  const handleViewHistory = async (employee: Employee) => {
    try {
      const q = query(
        collection(db, 'categories'),
        where('title', '==', `${employee.lastName} ${employee.firstName}`),
        where('row', '==', 2)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const categoryDoc = snapshot.docs[0];
        setSelectedCategory({
          id: categoryDoc.id,
          title: categoryDoc.data().title,
          amount: categoryDoc.data().amount,
          iconName: categoryDoc.data().icon,
          color: categoryDoc.data().color,
          row: 2
        });
        setShowHistory(true);
      }
    } catch (error) {
      console.error('Error fetching category:', error);
      alert('Ошибка при получении истории транзакций');
    }
  };

  const handleContextMenu = (e: React.MouseEvent, employee: Employee) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setSelectedEmployee(employee);
    setShowContextMenu(true);
  };

  const handleEdit = () => {
    setShowEditForm(true);
    setShowContextMenu(false);
  };

  const formatDate = (createdAt: any) => {
    if (!createdAt || !createdAt.seconds) {
      return 'Дата не указана';
    }
    return new Date(createdAt.seconds * 1000).toLocaleDateString();
  };

  const filteredEmployees = employees.filter(employee => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      employee.lastName.toLowerCase().includes(searchTerm) ||
      employee.firstName.toLowerCase().includes(searchTerm) ||
      employee.position.toLowerCase().includes(searchTerm)
    );
  });

  if (showAddForm) {
    return <EmployeeForm onBack={() => setShowAddForm(false)} />;
  }

  if (showEditForm && selectedEmployee) {
    return <EmployeeForm employeeId={selectedEmployee.id} onBack={() => setShowEditForm(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button onClick={() => window.history.back()} className="mr-4">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <h1 className="text-2xl font-semibold text-gray-900">Сотрудники</h1>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
            >
              <Plus className="w-5 h-5 mr-1" />
              Добавить сотрудника
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Поиск сотрудников..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Нет сотрудников</h3>
            <p className="text-gray-500">
              {searchQuery ? 'По вашему запросу ничего не найдено' : 'Добавьте первого сотрудника'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEmployees.map((employee) => (
              <div
                key={employee.id}
                onContextMenu={(e) => handleContextMenu(e, employee)}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-default"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-amber-600" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          {employee.lastName} {employee.firstName}
                        </h3>
                        <div className="flex items-center text-gray-500 text-sm">
                          <Building2 className="w-4 h-4 mr-1" />
                          {employee.position}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-gray-600">
                      <Phone className="w-4 h-4 mr-2" />
                      <span>{employee.phone}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Mail className="w-4 h-4 mr-2" />
                      <span>{employee.email}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Дата регистрации:</span>
                      <span className="text-gray-900">{formatDate(employee.createdAt)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-500">Заработная плата:</span>
                      <span className="text-gray-900">{employee.salary.toLocaleString()} ₸</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showContextMenu && selectedEmployee && (
        <EmployeeContextMenu
          position={contextMenuPosition}
          onClose={() => setShowContextMenu(false)}
          onEdit={handleEdit}
          onDelete={() => handleDelete(selectedEmployee)}
          onViewHistory={() => handleViewHistory(selectedEmployee)}
          employeeName={`${selectedEmployee.lastName} ${selectedEmployee.firstName}`}
        />
      )}

      {showHistory && selectedCategory && (
        <TransactionHistory
          category={selectedCategory}
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
};