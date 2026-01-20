cat > prisma-test.mjs << 'EOF'
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

await prisma.$connect();
console.log("Prisma OK");
process.exit(0);
EOF
