package skypixel.Misc;

import com.comphenix.protocol.PacketType;
import org.bukkit.Bukkit;

public class ProtocolDebug {
    public static void listAllPackets() {
        Bukkit.getLogger().info("========== AVAILABLE PACKETS ==========");
        
        // Server packets
        Bukkit.getLogger().info("\n--- SERVER PACKETS ---");
        for (PacketType packet : PacketType.Play.Server.getInstance()) {
            if (packet.name().contains("SPAWN") || packet.name().contains("ENTITY") || packet.name().contains("PLAYER")) {
                Bukkit.getLogger().info("✓ " + packet.name() + " (" + packet + ")");
            }
        }
        
        Bukkit.getLogger().info("\n========== END ==========");
    }
}
