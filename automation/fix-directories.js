const fs = require('fs').promises;
const path = require('path');

class DirectoryFixer {
    constructor() {
        this.projectRoot = path.join(__dirname, '..');
        this.requiredDirectories = [
            'content/drafts',
            'content/approved',
            'content/published',
            'content/rejected',
            'content/archive',
            'content/social-queue'
        ];
        this.successCount = 0;
        this.errorCount = 0;
    }

    async createDirectory(dirPath) {
        const fullPath = path.join(this.projectRoot, dirPath);
        
        try {
            // Check if directory already exists
            const stats = await fs.stat(fullPath);
            if (stats.isDirectory()) {
                console.log(`✅ Directory already exists: ${dirPath}`);
                return true;
            } else {
                console.log(`❌ Path exists but is not a directory: ${dirPath}`);
                return false;
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                // Directory doesn't exist, create it
                try {
                    await fs.mkdir(fullPath, { recursive: true });
                    console.log(`🆕 Created directory: ${dirPath}`);
                    return true;
                } catch (createError) {
                    console.error(`❌ Failed to create directory ${dirPath}:`, createError.message);
                    return false;
                }
            } else {
                console.error(`❌ Error checking directory ${dirPath}:`, error.message);
                return false;
            }
        }
    }

    async setPermissions(dirPath) {
        const fullPath = path.join(this.projectRoot, dirPath);
        
        try {
            // Set permissions to readable/writable (755)
            await fs.chmod(fullPath, 0o755);
            console.log(`🔐 Set permissions for: ${dirPath}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to set permissions for ${dirPath}:`, error.message);
            return false;
        }
    }

    async createGitkeep(dirPath) {
        const fullPath = path.join(this.projectRoot, dirPath);
        const gitkeepPath = path.join(fullPath, '.gitkeep');
        
        try {
            // Check if .gitkeep already exists
            await fs.access(gitkeepPath);
            console.log(`📝 .gitkeep already exists in: ${dirPath}`);
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                // .gitkeep doesn't exist, create it
                try {
                    await fs.writeFile(gitkeepPath, '');
                    console.log(`📝 Created .gitkeep in: ${dirPath}`);
                    return true;
                } catch (createError) {
                    console.error(`❌ Failed to create .gitkeep in ${dirPath}:`, createError.message);
                    return false;
                }
            } else {
                console.error(`❌ Error checking .gitkeep in ${dirPath}:`, error.message);
                return false;
            }
        }
    }

    async checkDirectoryContents(dirPath) {
        const fullPath = path.join(this.projectRoot, dirPath);
        
        try {
            const files = await fs.readdir(fullPath);
            const nonGitkeepFiles = files.filter(file => file !== '.gitkeep');
            
            if (nonGitkeepFiles.length === 0) {
                console.log(`📂 Directory is empty (excluding .gitkeep): ${dirPath}`);
                return true;
            } else {
                console.log(`📁 Directory contains ${nonGitkeepFiles.length} files: ${dirPath}`);
                return false;
            }
        } catch (error) {
            console.error(`❌ Error reading directory contents ${dirPath}:`, error.message);
            return false;
        }
    }

    async fixDirectory(dirPath) {
        console.log(`\n🔧 Processing directory: ${dirPath}`);
        
        let success = true;
        
        // Step 1: Create directory if it doesn't exist
        const created = await this.createDirectory(dirPath);
        if (!created) {
            success = false;
        }
        
        // Step 2: Set proper permissions
        if (created) {
            const permissionsSet = await this.setPermissions(dirPath);
            if (!permissionsSet) {
                success = false;
            }
        }
        
        // Step 3: Check if directory is empty and create .gitkeep if needed
        if (created) {
            const isEmpty = await this.checkDirectoryContents(dirPath);
            if (isEmpty) {
                const gitkeepCreated = await this.createGitkeep(dirPath);
                if (!gitkeepCreated) {
                    success = false;
                }
            }
        }
        
        if (success) {
            this.successCount++;
            console.log(`✅ Successfully processed: ${dirPath}`);
        } else {
            this.errorCount++;
            console.log(`❌ Failed to process: ${dirPath}`);
        }
        
        return success;
    }

    async run() {
        console.log('🚀 Starting Directory Fixer...');
        console.log(`📂 Project root: ${this.projectRoot}`);
        console.log(`🎯 Directories to process: ${this.requiredDirectories.length}`);
        
        const startTime = Date.now();
        
        for (const dirPath of this.requiredDirectories) {
            await this.fixDirectory(dirPath);
        }
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        console.log('\n📊 Summary Report:');
        console.log(`⏱️  Duration: ${duration} seconds`);
        console.log(`✅ Successfully processed: ${this.successCount} directories`);
        console.log(`❌ Failed to process: ${this.errorCount} directories`);
        console.log(`📈 Success rate: ${((this.successCount / this.requiredDirectories.length) * 100).toFixed(1)}%`);
        
        if (this.errorCount === 0) {
            console.log('\n🎉 All directories fixed successfully!');
            process.exit(0);
        } else {
            console.log('\n⚠️  Some directories failed to process. Please check the errors above.');
            process.exit(1);
        }
    }
}

// Run the directory fixer
if (require.main === module) {
    const fixer = new DirectoryFixer();
    fixer.run().catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });
}

module.exports = DirectoryFixer;