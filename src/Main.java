import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.util.Scanner;
import java.util.*;
import java.io.Serializable;
/**
 * ClassName:${NAME}
 * Package:
 * Description:
 *
 * @Autor: Tong
 * @Create: 26.09.25 - 07:02
 * @Version: v1.0
 *///TIP To <b>Run</b> code, press <shortcut actionId="Run"/> or
// click the <icon src="AllIcons.Actions.Execute"/> icon in the gutter.
public class Main {
    static Bank bank = new Bank();
    static  final String FILE_NAME = "bank.dat"; //Data storage file

    public static void main(String[] args) {
        bank = loadBank();
        if (bank == null) {
            bank = new Bank();
            System.out.println("No saved data found. Starting with a new bank.");
        } else {
            System.out.println("✅ Loaded bank data from file.");
        }

        Scanner sc = new Scanner(System.in);

        System.out.println("Banking System");

        //menu loop
        while (true) {
            System.out.println("Main Menu");
            System.out.println("1) Create Account");
            System.out.println("2) Login");
            System.out.println("0) Exit");
            System.out.println("Choose:");

            String choice = sc.nextLine().trim();

            switch (choice) {
                case "1":
                    System.out.println("Enter owner name:");
                    String name = sc.nextLine();
                    System.out.println("Set your PIN");
                    String pin = sc.nextLine();

                    Account acc = bank.createAccount(name,pin);
                    System.out.println("☑️ Account created successfully!");
                    System.out.println("Your Account ID is: " + acc.getAccountId());
                    break;
                case "2":
                    System.out.println("Enter Account ID: ");
                    String id = sc.nextLine();
                    System.out.println("Enter PIN: ");
                    String pinLogin = sc.nextLine();

                    try {
                        Account accLogin = bank.login(id, pinLogin);
                        System.out.println("☑️ Login successfully! Welcome, " + accLogin.getOwnerName());
                        accountMenu(sc,accLogin);
                    } catch (Exception e) {
                        System.out.println(e.getMessage());
                    }
                    break;
                case "0":
                    saveBank(bank);
                    System.out.println("Bye!");
                    sc.close();
                    return;
                default:
                    System.out.println("Invalid choice.");
            }
        }
    }
    public static void accountMenu(Scanner sc, Account acc) {
        while (true) {
            System.out.println("\n---Account Menu---");
            System.out.println("1) Check Balance");
            System.out.println("2) Deposit");
            System.out.println("3) Withdraw");
            System.out.println("4) Transfer");
            System.out.println("5) Show Transaction History");
            System.out.println("0) Logout");
            System.out.print("Choose: ");

            String choice = sc.nextLine().trim();

            switch (choice) {
                case "1":
                    System.out.println("Your balance: " + acc.getBalance());
                    break;
                case "2":
                    System.out.println("Enter deposit amount: ");
                    int deposit = Integer.parseInt(sc.nextLine());
                    acc.deposit(deposit);
                    System.out.println("☑️ Deposit successful. New balance: " + acc.getBalance());
                    break;
                case "3":
                    System.out.println("Enter withdraw amount: ");
                    int withdraw = Integer.parseInt(sc.nextLine());
                    try {
                        acc.withdraw(withdraw);
                        System.out.println("☑️ Withdraw successful. New balance: " + acc.getBalance());
                    } catch (Exception e) {
                        System.out.println(e.getMessage());
                    }
                    break;
                case "4":
                    System.out.println("Enter target account ID: ");
                    String targetId = sc.nextLine();
                    System.out.println("Enter transfer amount: ");
                    int transferAmount = Integer.parseInt(sc.nextLine());

                    try {
                        Account target = Main.bank.findAccount(targetId);
                        acc.transferTo(target,transferAmount);
                        System.out.println("Transfer successful. Your new balance: " +acc.getBalance());
                    } catch (Exception e) {
                        System.out.println(e.getMessage());
                    }
                    break;
                case "5":
                    System.out.println("\n---Transaction History---");
                    for (String h : acc.getHistory()) {
                        System.out.println(h);
                    }
                    break;
                case "0":
                    System.out.println("Logged out");
                    return;
                default:
                    System.out.println("Invalid choice");
            }
        }
    }

    //save bank data
    private static void saveBank(Bank bank) {
        try(ObjectOutputStream out = new ObjectOutputStream((new java.io.FileOutputStream(FILE_NAME)))) {
            out.writeObject(bank);
            System.out.println("Bank data saved to " + FILE_NAME);
        } catch (Exception e) {
            System.out.println("Failed to save ban data: " + e.getMessage());
        }
    }

    //load bank data
    private static Bank loadBank() {
        try(ObjectInputStream in = new ObjectInputStream(new java.io.FileInputStream(FILE_NAME))) {
            return (Bank) in.readObject();
        } catch (Exception e) {
            return null;
        }
    }
}

class Account implements Serializable{
    private final String accountId;
    private final String ownerName;
    private final String pin;
    private  int balance;
    private List<String> history; //transaction history

    public Account(String accountId, String ownerName, String pin) {
        this.accountId = accountId;
        this.ownerName = ownerName;
        this.pin = pin;
        this.balance = 0;
        this.history = new ArrayList<>();
        addHistory("Account created for " + ownerName);
    }

    public List<String> getHistory() {
        return history;
    }
    public String getAccountId() {
        return accountId;
    }

    public String getOwnerName() {
        return ownerName;
    }

    public int getBalance() {
        return balance;
    }

    public boolean checkPin(String input) {
        return this.pin.equals(input);
    }

    //deposit
    public void deposit(int amount) {
        if (amount <= 0) throw new IllegalArgumentException("Deposit must be positive.");
        addHistory("Deposit + " + amount + " → Balance = " + balance);
        balance += amount;
    }

    //withdraw
    public void withdraw(int amount) {
        if (amount <= 0) throw new IllegalArgumentException("Withdraw must be positive");
        if (amount > balance) throw new IllegalArgumentException("Insufficient funds");
        addHistory("Withdraw - " + amount + " → Balance = " + balance);
        balance -= amount;
    }

    public void transferTo(Account target, int amount) {
        if (target == null) throw new IllegalArgumentException("Target account not found.");
        if (amount <= 0) throw new IllegalArgumentException("Transfer amount must be positive.");
        if (amount > balance) throw new IllegalArgumentException("Insufficient funds");

        this.balance -= amount;
        target.balance += amount;

        addHistory("Transfer -" + amount + " to " + target.accountId + " → Balance = " + this.balance);
        target.addHistory("Transfer +" + amount + " from " + this.accountId + " → Balance = " + target.balance);
    }

    private void addHistory(String event) {
        String timestamp = new Date().toString();
        history.add("[" + timestamp + "]" + event);
    }
}

class Bank implements Serializable {
    private Map<String, Account> accounts = new HashMap<>();

    //create account
    public Account createAccount(String ownerName, String pin) {
        String id = UUID.randomUUID().toString().substring(0,6);
        Account acc = new Account(id, ownerName, pin);
        accounts.put(id,acc);
        return acc;
    }

    //login
    public Account login(String accountId, String pin) {
        Account acc = accounts.get(accountId);
        if (acc == null) {
            throw new IllegalArgumentException("❌ Account not fount.");
        }
        if (!acc.checkPin(pin)) {
            throw new IllegalArgumentException("❌ Invalid PIN");
        }
        return acc;
    }

    public Account findAccount(String accountId) {
        return accounts.get(accountId);
    }
}