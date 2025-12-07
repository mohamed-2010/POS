import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { db, User, Role } from "@/shared/lib/indexedDB";

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  can: (resource: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<Role | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      await db.init();
      await db.initDefaultData();
      await db.initializeDefaultRoles(); // تهيئة الأدوار الافتراضية
      await db.migrateRolesPermissions(); // تحديث الصلاحيات للأدوار الموجودة
      await db.migrateToV12(); // Migration للبيانات القديمة

      // التحقق من وجود مستخدم مسجل مسبقاً
      const savedUserId = localStorage.getItem("currentUserId");
      if (savedUserId) {
        const userData = await db.get<User>("users", savedUserId);
        if (userData && userData.active) {
          setUser(userData);
          // جلب صلاحيات الدور من قاعدة البيانات
          await loadUserRole(userData);
        } else {
          localStorage.removeItem("currentUserId");
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const loadUserRole = async (user: User) => {
    try {
      // Prioritize roleId, fallback to role for backwards compatibility
      const roleIdToLoad = user.roleId || user.role;
      console.log(
        `[AuthContext] Loading role for user "${user.username}": ${roleIdToLoad}`
      );

      const role = await db.get<Role>("roles", roleIdToLoad);

      if (role) {
        console.log(
          `[AuthContext] Role loaded successfully:`,
          role.name,
          `(${role.id})`
        );
        console.log(`[AuthContext] Permissions:`, role.permissions);
        setUserRole(role);
      } else {
        console.error(`[AuthContext] Role not found for ID: ${roleIdToLoad}`);
        console.error(`[AuthContext] User object:`, user);
        setUserRole(null);
      }
    } catch (error) {
      console.error("[AuthContext] Error loading role:", error);
      setUserRole(null);
    }
  };

  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    try {
      const users = await db.getAll<User>("users");
      const foundUser = users.find(
        (u) => u.username === username && u.password === password && u.active
      );

      if (foundUser) {
        setUser(foundUser);
        localStorage.setItem("currentUserId", foundUser.id);
        // جلب صلاحيات الدور
        await loadUserRole(foundUser);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setUserRole(null);
    localStorage.removeItem("currentUserId");
  };

  const can = (resource: string, action: string): boolean => {
    if (!user || !userRole) return false;

    // جلب صلاحيات المورد من الدور
    const resourcePermissions = userRole.permissions[resource];
    if (!resourcePermissions) return false;

    return resourcePermissions.includes(action);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, can }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
